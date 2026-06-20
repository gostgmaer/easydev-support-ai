import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class FeatureFlagEngine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeatureFlagEngine.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
  ) {}

  async onModuleInit() {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
      };
      this.redisClient = new Redis(redisOptions);
      this.isRedisConnected = true;
      this.logger.log(
        'FeatureFlagEngine successfully connected to Redis cache',
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to connect Redis in FeatureFlagEngine: ${err.message}. Running cacheless.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  async resolveFlag(
    tenantId: string,
    featureKey: string,
    context?: { userId?: string },
  ): Promise<boolean> {
    // 1. Environment Overrides
    const envKey = `FEATURE_FLAG_${featureKey.toUpperCase()}`;
    if (process.env[envKey] !== undefined) {
      return process.env[envKey] === 'true';
    }

    // 2. Cache Lookup
    const cacheKey = `settings:flags:${tenantId}:${featureKey}`;
    if (this.isRedisConnected && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached !== null) {
          return cached === 'true';
        }
      } catch (err: any) {
        this.logger.error(`Redis cache get error: ${err.message}`);
      }
    }

    // 3. Database Lookup
    const flag = await this.settingsRepo.getFeatureFlagByKey(
      tenantId,
      featureKey,
    );
    if (!flag) {
      return false; // Default fallback
    }

    let resolved = flag.enabled;

    // 4. Percentage Rollout
    if (resolved && flag.rolloutPercentage < 100) {
      const hashInput = context?.userId || tenantId;
      const bucket = this.getDeterministicPercentage(hashInput);
      resolved = bucket < flag.rolloutPercentage;
    }

    // 5. Cache Save
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(cacheKey, String(resolved), 'EX', 60); // Cache for 60 seconds
      } catch (err: any) {
        this.logger.error(`Redis cache set error: ${err.message}`);
      }
    }

    return resolved;
  }

  async invalidateCache(tenantId: string, featureKey: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const cacheKey = `settings:flags:${tenantId}:${featureKey}`;
        await this.redisClient.del(cacheKey);
      } catch (err: any) {
        this.logger.error(`Redis cache invalidate error: ${err.message}`);
      }
    }
  }

  private getDeterministicPercentage(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 100);
  }
}
