import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private redisClient: Redis | null = null;
  private isConnected = false;

  constructor() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        maxRetriesPerRequest: 1,
      });
      this.redisClient.on('connect', () => {
        this.isConnected = true;
      });
      this.redisClient.on('error', () => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only apply to POST/PUT/PATCH mutations
    if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) {
      return next.handle(); // Skip if no key provided
    }

    if (!idempotencyKey.match(/^[a-zA-Z0-9_-]{8,128}$/)) {
      throw new BadRequestException(
        'Invalid format for x-idempotency-key header',
      );
    }

    const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
    const cacheKey = `idempotency:${tenantId}:${idempotencyKey}`;

    if (!this.isConnected || !this.redisClient) {
      return next.handle(); // Fallback if Redis is down
    }

    // Try to acquire lock and check cache
    const lockKey = `${cacheKey}:lock`;
    const isLocked = await (this.redisClient.set as any)(
      lockKey,
      'LOCK',
      'PX',
      10000,
      'NX',
    ); // 10s execution lock

    if (!isLocked) {
      throw new ConflictException(
        'Concurrent request execution in progress. Please retry.',
      );
    }

    const cachedResponse = await this.redisClient.get(cacheKey);
    if (cachedResponse) {
      await this.redisClient.del(lockKey); // Release lock
      const parsed = JSON.parse(cachedResponse);
      return of(parsed);
    }

    return next.handle().pipe(
      tap(
        async (response) => {
          if (this.redisClient) {
            // Save response cache for 24 hours
            await this.redisClient.set(
              cacheKey,
              JSON.stringify(response),
              'EX',
              86400,
            );
            await this.redisClient.del(lockKey); // Release lock
          }
        },
        async () => {
          if (this.redisClient) {
            await this.redisClient.del(lockKey); // Release lock on error to allow retries
          }
        },
      ),
    );
  }
}
