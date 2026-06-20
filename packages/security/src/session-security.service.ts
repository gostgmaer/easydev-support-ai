import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SessionSecurityService {
  private readonly redis: Redis;
  private readonly jwtSecret = process.env.JWT_SECRET || 'jwt-session-secret-key-123456';
  private readonly maxConcurrentSessions = 5;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380', 10),
      maxRetriesPerRequest: 1,
    });
  }

  async createSession(userId: string, tenantId: string, clientIp: string, userAgent: string): Promise<{ token: string; refreshToken: string }> {
    const token = jwt.sign({ userId, tenantId, clientIp, userAgent }, this.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId, tenantId, type: 'refresh' }, this.jwtSecret, { expiresIn: '7d' });

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
    const key = `tenant:${tenantId}:user:${userId}:sessions`;
    await this.redis.del(key);
  }
}
