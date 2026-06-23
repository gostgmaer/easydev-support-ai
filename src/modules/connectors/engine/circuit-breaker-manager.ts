import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import {
  CircuitBreaker,
  CircuitBreakerSnapshot,
  DEFAULT_CIRCUIT_OPTIONS,
} from '../domain/circuit-breaker';

@Injectable()
export class CircuitBreakerManager implements OnModuleDestroy {
  private readonly logger = new Logger(CircuitBreakerManager.name);
  private readonly redis: Redis;
  private isRedisAvailable = false;
  private readonly memoryCache = new Map<string, CircuitBreakerSnapshot>();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.redis.on('error', (err) => {
      if (this.isRedisAvailable) {
        this.isRedisAvailable = false;
        this.logger.warn(
          `Redis connection failed in CircuitBreakerManager: ${err.message}. Falling back to in-memory.`,
        );
      }
    });

    this.redis.on('ready', () => {
      this.isRedisAvailable = true;
    });

    this.redis.connect().catch(() => {
      this.isRedisAvailable = false;
    });
  }

  // Keyed by upstream (connectorType + baseUrl), not tenant+connectorId - two
  // tenants hitting the same shared upstream (e.g. both on a Stripe
  // connector, or both pointed at the same SaaS API host) trip and recover
  // the same breaker, so one tenant's failures protect the other from
  // hammering an already-struggling upstream. A tenant-specific baseUrl
  // (e.g. a custom REST connector pointed at that tenant's own backend)
  // still isolates naturally, since the baseUrl itself differs.
  private getCacheKey(breakerGroupKey: string): string {
    return `connector:cb:${breakerGroupKey}`;
  }

  public async getBreaker(breakerGroupKey: string): Promise<CircuitBreaker> {
    const key = this.getCacheKey(breakerGroupKey);
    let snapshot: CircuitBreakerSnapshot | undefined;

    if (this.isRedisAvailable) {
      try {
        const val = await this.redis.get(key);
        if (val) {
          snapshot = JSON.parse(val);
        }
      } catch (err: any) {
        this.logger.debug(`Failed to get CB state from Redis: ${err.message}`);
      }
    }

    if (!snapshot) {
      snapshot = this.memoryCache.get(key);
    }

    return new CircuitBreaker(DEFAULT_CIRCUIT_OPTIONS, snapshot);
  }

  public async saveBreaker(
    breakerGroupKey: string,
    breaker: CircuitBreaker,
  ): Promise<void> {
    const key = this.getCacheKey(breakerGroupKey);
    const snapshot = breaker.snapshot();

    // Save to memory
    this.memoryCache.set(key, snapshot);

    if (this.isRedisAvailable) {
      try {
        // Cache circuit state for a week
        await this.redis.set(
          key,
          JSON.stringify(snapshot),
          'EX',
          7 * 24 * 3600,
        );
      } catch (err: any) {
        this.logger.debug(`Failed to save CB state to Redis: ${err.message}`);
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      // Ignore
    }
  }
}
