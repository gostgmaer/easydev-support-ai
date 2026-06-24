import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import axios from 'axios';
import { PERMISSIONS_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly redis: Redis;
  private readonly logger = new Logger(PermissionGuard.name);
  private redisAvailable = true;

  constructor(private readonly reflector: Reflector) {
    // Matches the established resilient pattern used elsewhere in this
    // codebase (e.g. RedisCacheService) - lazyConnect + no offline queue +
    // an explicit available flag, instead of a bare ioredis client with no
    // error handler at all, which is what was here before. An unhandled
    // 'error' event on an EventEmitter throws by default and can crash an
    // otherwise-unrelated request path, not just this permission check.
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
        this.logger.warn(`Permission cache Redis unavailable, falling back to IAM directly: ${err.message}`);
      }
    });

    this.redis.on('ready', () => {
      this.redisAvailable = true;
    });

    this.redis.connect().catch(() => {
      this.redisAvailable = false;
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!user || !user.id) {
      throw new ForbiddenException('IAM User session context not found');
    }

    const cacheKey = `tenant:${tenantId}:user:${user.id}:permissions`;
    let userPermissions: string[] = [];
    let cached: string | null = null;

    if (this.redisAvailable) {
      try {
        cached = await this.redis.get(cacheKey);
      } catch {
        // Best-effort cache read - fall through to fetching from IAM directly.
      }
    }

    if (cached) {
      userPermissions = JSON.parse(cached);
    } else {
      userPermissions = await this.fetchPermissionsFromIam(user.id, tenantId);
      if (this.redisAvailable) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(userPermissions), 'EX', 300);
        } catch {
          // Best-effort cache write - the permission check itself already succeeded.
        }
      }
    }

    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException(`Access Denied: Requires permissions: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }

  private async fetchPermissionsFromIam(userId: string, tenantId: string): Promise<string[]> {
    const iamUrl = process.env.EASYDEV_IAM_URL || 'http://localhost:3001';
    try {
      const response = await axios.post(`${iamUrl}/v1/users/${userId}/permissions`, { tenantId }, { timeout: 1000 });
      return response.data.permissions || [];
    } catch (err: any) {
      // Previously granted a hardcoded set of permissions to one specific
      // literal userId ('user-123') whenever IAM was unreachable - looked
      // like leftover test/debug code (no seed data, test fixture, or any
      // other reference to that ID anywhere in this codebase). Fail closed
      // instead: if IAM can't be reached, the caller gets no permissions,
      // not an unconditional grant tied to a magic string.
      this.logger.warn(`Failed to fetch permissions from IAM for user ${userId}: ${err?.message}`);
      return [];
    }
  }
}
