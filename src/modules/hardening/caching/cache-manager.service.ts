import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheManagerService.name);
  private redisClient: Redis | null = null;
  private isConnected = false;
  private readonly cacheVersion = 'v1';

  // Metrics
  private hits = 0;
  private misses = 0;

  onModuleInit() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 2,
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis Cache Client connected successfully.');
      });

      this.redisClient.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis Cache Client error: ${err.message}`);
      });
    } catch (e: any) {
      this.logger.error(
        `Failed to initialize Redis Cache Client: ${e.message}`,
      );
    }
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }

  private buildKey(tenantId: string, namespace: string, key: string): string {
    // Distributed & isolated multi-tenant cache keys: cache:v1:tenant-uuid:namespace:key
    return `cache:${this.cacheVersion}:${tenantId}:${namespace}:${key}`;
  }

  async get<T>(
    tenantId: string,
    namespace: string,
    key: string,
  ): Promise<T | null> {
    if (!this.isConnected || !this.redisClient) {
      this.misses++;
      return null;
    }

    try {
      const fullKey = this.buildKey(tenantId, namespace, key);
      const data = await this.redisClient.get(fullKey);
      if (data) {
        this.hits++;
        return JSON.parse(data) as T;
      }
      this.misses++;
      return null;
    } catch (err: any) {
      this.logger.warn(`Failed to GET from cache: ${err.message}`);
      return null;
    }
  }

  async set<T>(
    tenantId: string,
    namespace: string,
    key: string,
    value: T,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    if (!this.isConnected || !this.redisClient) return;

    try {
      const fullKey = this.buildKey(tenantId, namespace, key);
      await this.redisClient.set(
        fullKey,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to SET in cache: ${err.message}`);
    }
  }

  async invalidate(
    tenantId: string,
    namespace: string,
    key: string,
  ): Promise<void> {
    if (!this.isConnected || !this.redisClient) return;

    try {
      const fullKey = this.buildKey(tenantId, namespace, key);
      await this.redisClient.del(fullKey);
    } catch (err: any) {
      this.logger.warn(`Failed to invalidate cache key: ${err.message}`);
    }
  }

  async invalidateNamespace(
    tenantId: string,
    namespace: string,
  ): Promise<void> {
    if (!this.isConnected || !this.redisClient) return;

    try {
      // Find and delete all keys in the namespace for the tenant
      const pattern = `cache:${this.cacheVersion}:${tenantId}:${namespace}:*`;
      let cursor = '0';
      do {
        const reply = await this.redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = reply[0];
        const keys = reply[1];
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err: any) {
      this.logger.warn(
        `Failed to invalidate namespace ${namespace}: ${err.message}`,
      );
    }
  }

  async warmupCache(
    tenantId: string,
    namespace: string,
    dataLoader: () => Promise<Record<string, any>>,
  ): Promise<void> {
    this.logger.log(
      `Warming up cache for tenant: ${tenantId}, namespace: ${namespace}`,
    );
    try {
      const data = await dataLoader();
      for (const [key, value] of Object.entries(data)) {
        await this.set(tenantId, namespace, key, value, 7200); // cache for 2 hours
      }
    } catch (err: any) {
      this.logger.error(
        `Warmup failed for ${tenantId}:${namespace}: ${err.message}`,
      );
    }
  }

  getCacheMetrics() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate.toFixed(2)}%`,
      connected: this.isConnected,
    };
  }
}
