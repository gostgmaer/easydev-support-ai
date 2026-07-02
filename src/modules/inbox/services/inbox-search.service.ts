import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import type {
  IInboxRepository,
  InboxQueryOptions,
} from '../repositories/inbox-repository.interface';
import { InboxSearchDto } from '../dtos';

/**
 * Search over the inbox projection. Reads only the optimized inbox_views table
 * (never raw messages) and caches result sets in Redis for repeated queries.
 */
@Injectable()
export class InboxSearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InboxSearchService.name);
  private redis?: Redis;
  private cacheEnabled = false;
  private readonly ttlSeconds = Number(
    process.env.INBOX_SEARCH_CACHE_TTL || 30,
  );

  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        password: process.env.REDIS_PASSWORD,
        lazyConnect: true,
      });
      await this.redis.connect();
      this.cacheEnabled = true;
      this.logger.log('Inbox search Redis cache connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Inbox search Redis cache unavailable (${message}); querying projections directly`,
      );
      this.cacheEnabled = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit();
  }

  private cacheKey(tenantId: string, options: InboxQueryOptions): string {
    const hash = createHash('sha1')
      .update(JSON.stringify(options))
      .digest('hex');
    return `inbox:search:${tenantId}:${hash}`;
  }

  private async cached<T>(
    tenantId: string,
    options: InboxQueryOptions,
    producer: () => Promise<T>,
  ): Promise<T> {
    if (!this.cacheEnabled || !this.redis) return producer();
    const key = this.cacheKey(tenantId, options);
    try {
      const hit = await this.redis.get(key);
      if (hit) return JSON.parse(hit) as T;
      const result = await producer();
      await this.redis.set(key, JSON.stringify(result), 'EX', this.ttlSeconds);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Inbox search cache error: ${message}`);
      return producer();
    }
  }

  private async run(tenantId: string, options: InboxQueryOptions) {
    const result = await this.inboxRepo.listViews(tenantId, options);
    return {
      data: result.data.map((v) => v.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  async search(tenantId: string, dto: InboxSearchDto) {
    const options: InboxQueryOptions = {
      search: dto.query,
      status: dto.status,
      priority: dto.priority,
      assignedAgentId: dto.assignedAgentId,
      assignedTeamId: dto.assignedTeamId,
      customerId: dto.customerId,
      channelId: dto.channelId,
      limit: dto.limit,
      page: dto.page,
    };
    return this.cached(tenantId, options, () => this.run(tenantId, options));
  }

  async byCustomer(tenantId: string, customerId: string, limit = 25) {
    const options: InboxQueryOptions = { customerId, limit };
    return this.cached(tenantId, options, () => this.run(tenantId, options));
  }

  async global(tenantId: string, query: string, limit = 25) {
    const options: InboxQueryOptions = { search: query, limit };
    return this.cached(tenantId, options, () => this.run(tenantId, options));
  }

  /** Invalidates all cached search result sets for a tenant. */
  async invalidateTenant(tenantId: string): Promise<{ cleared: number }> {
    if (!this.cacheEnabled || !this.redis) return { cleared: 0 };
    let cleared = 0;
    let cursor = '0';
    const pattern = `inbox:search:${tenantId}:*`;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        200,
      );
      cursor = next;
      if (keys.length > 0) {
        cleared += await this.redis.del(...keys);
      }
    } while (cursor !== '0');
    return { cleared };
  }
}
