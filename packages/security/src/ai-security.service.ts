import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { PiiProtectionService } from './pii-protection.service';

@Injectable()
export class AiSecurityService {
  private readonly redis: Redis;
  private readonly logger = new Logger(AiSecurityService.name);
  private redisAvailable = true;
  private readonly injectionPatterns = [
    /ignore\s+(?:the\s+)?prior\s+instructions/i,
    /ignore\s+above/i,
    /system\s+override/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /bypass\s+restrictions/i,
    /dan\s+mode/i,
    /reveal\s+(?:your\s+)?system\s+prompt/i,
    /print\s+instructions/i
  ];

  constructor(
    private readonly piiService: PiiProtectionService,
  ) {
    // Matches the established resilient pattern used elsewhere in this
    // codebase (e.g. RedisCacheService) - previously a bare client with no
    // lazyConnect/error handler, so a Redis blip would throw uncaught out
    // of enforceCostControl()/trackCost()/checkRateLimit(), all 3 with no
    // try/catch around their Redis calls at all - blocking every AI call
    // platform-wide on a transient cache outage.
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.redis.on('error', (err: Error) => {
      if (this.redisAvailable) {
        this.redisAvailable = false;
        this.logger.warn(
          `AI cost/rate-limit Redis unavailable - cost budget and per-hour limits are unenforced until it recovers: ${err.message}`,
        );
      }
    });

    this.redis.on('ready', () => {
      this.redisAvailable = true;
    });

    this.redis.connect().catch(() => {
      this.redisAvailable = false;
    });
  }

  detectPromptInjection(prompt: string): void {
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(prompt)) {
        throw new BadRequestException('Security violation: Prompt injection attempt detected');
      }
    }
  }

  validateToolAccess(agentPermissions: string[], toolRequiredPermissions: string[]): void {
    const hasAccess = toolRequiredPermissions.every(perm => agentPermissions.includes(perm));
    if (!hasAccess) {
      throw new ForbiddenException('AI agent attempt to execute restricted tool denied due to insufficient scope');
    }
  }

  async enforceCostControl(tenantId: string, limitDollars: number): Promise<void> {
    if (!this.redisAvailable) {
      this.logger.warn(`Cost budget check skipped for tenant ${tenantId} - Redis unavailable`);
      return;
    }
    try {
      const key = `tenant:${tenantId}:ai:cost`;
      const costStr = await this.redis.get(key);
      const cost = costStr ? parseFloat(costStr) : 0;

      if (cost > limitDollars) {
        throw new ForbiddenException(`AI cost budget limit exceeded for tenant ${tenantId}. Current: $${cost}, Limit: $${limitDollars}`);
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.warn(`Cost budget check failed for tenant ${tenantId}, proceeding without it: ${(err as Error)?.message}`);
    }
  }

  async trackCost(tenantId: string, costDollars: number): Promise<void> {
    if (!this.redisAvailable) return;
    try {
      const key = `tenant:${tenantId}:ai:cost`;
      await this.redis.incrbyfloat(key, costDollars);
    } catch (err: any) {
      this.logger.warn(`Failed to track AI cost for tenant ${tenantId}: ${err?.message}`);
    }
  }

  async checkRateLimit(tenantId: string, limitPerHour: number): Promise<void> {
    if (!this.redisAvailable) {
      this.logger.warn(`Rate limit check skipped for tenant ${tenantId} - Redis unavailable`);
      return;
    }
    try {
      const key = `tenant:${tenantId}:ai:ratelimit:${new Date().getUTCHours()}`;
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, 3600);
      }
      if (current > limitPerHour) {
        throw new ForbiddenException(`AI platform rate limit exceeded for tenant ${tenantId}`);
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.warn(`Rate limit check failed for tenant ${tenantId}, proceeding without it: ${(err as Error)?.message}`);
    }
  }
}
