import { Injectable, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SessionSecurityService {
  private readonly redis: Redis;
  private readonly logger = new Logger(SessionSecurityService.name);
  private readonly jwtSecret: string;
  private readonly maxConcurrentSessions = 5;
  private redisAvailable = true;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be set - refusing to sign sessions with no configured secret');
    }
    this.jwtSecret = process.env.JWT_SECRET;
    // Matches the established resilient pattern used elsewhere in this
    // codebase (e.g. RedisCacheService) - previously a bare client with no
    // lazyConnect/error handler, so a Redis outage would throw uncaught out
    // of createSession()/revokeAllSessions() (the only two methods here
    // with no try/catch around their Redis calls at all).
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
          `Session store Redis unavailable - concurrent-session limit and revocation list are degraded until it recovers: ${err.message}`,
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

  async createSession(userId: string, tenantId: string, clientIp: string, userAgent: string): Promise<{ token: string; refreshToken: string }> {
    const token = jwt.sign({ userId, tenantId, clientIp, userAgent }, this.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId, tenantId, type: 'refresh' }, this.jwtSecret, { expiresIn: '7d' });

    // The JWT itself is self-contained and valid regardless of Redis - if
    // the session store is down, degrade by skipping the concurrent-session
    // bookkeeping rather than failing the login outright.
    if (this.redisAvailable) {
      try {
        const key = `tenant:${tenantId}:user:${userId}:sessions`;
        const sessions = await this.redis.lrange(key, 0, -1);

        if (sessions.length >= this.maxConcurrentSessions) {
          const excess = sessions.length - this.maxConcurrentSessions + 1;
          for (let i = 0; i < excess; i++) {
            await this.redis.rpop(key);
          }
        }

        const sessionData = JSON.stringify({ token, clientIp, userAgent, createdAt: Date.now() });
        await this.redis.lpush(key, sessionData);
        await this.redis.expire(key, 604800);
      } catch (err: any) {
        this.logger.warn(`Failed to record session in Redis for user ${userId}: ${err?.message}`);
      }
    }

    return { token, refreshToken };
  }

  async validateSession(userId: string, tenantId: string, token: string, clientIp: string, userAgent: string): Promise<{ isValid: boolean; isSuspicious: boolean }> {
    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      if (decoded.userId !== userId || decoded.tenantId !== tenantId) {
        throw new UnauthorizedException('Session token ownership verification failed');
      }

      const key = `tenant:${tenantId}:user:${userId}:sessions`;
      const sessions = await this.redis.lrange(key, 0, -1);
      const activeSession = sessions.find(s => JSON.parse(s).token === token);
      
      if (!activeSession) {
        return { isValid: false, isSuspicious: false };
      }

      const sessionObj = JSON.parse(activeSession);
      const isSuspicious = sessionObj.clientIp !== clientIp || sessionObj.userAgent !== userAgent;

      return { isValid: true, isSuspicious };
    } catch {
      return { isValid: false, isSuspicious: false };
    }
  }

  async rotateToken(userId: string, tenantId: string, refreshToken: string, clientIp: string, userAgent: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded: any = jwt.verify(refreshToken, this.jwtSecret);
      if (decoded.userId !== userId || decoded.tenantId !== tenantId || decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.createSession(userId, tenantId, clientIp, userAgent);
    } catch {
      throw new UnauthorizedException('Refresh token rotation failed');
    }
  }

  async revokeAllSessions(userId: string, tenantId: string): Promise<void> {
    // Unlike createSession's graceful degrade, revocation must not silently
    // no-op under a Redis outage - the caller (logout-all, password change,
    // compromise response) needs to know the sessions were NOT actually
    // revoked, not get a false "success" while they're still live.
    if (!this.redisAvailable) {
      throw new ForbiddenException('Session store is currently unavailable - cannot revoke sessions');
    }
    const key = `tenant:${tenantId}:user:${userId}:sessions`;
    await this.redis.del(key);
  }
}
