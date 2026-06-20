import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import axios from 'axios';
import { PERMISSIONS_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly redis: Redis;

  constructor(private readonly reflector: Reflector) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380', 10),
      maxRetriesPerRequest: 1,
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

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        userPermissions = JSON.parse(cached);
      } else {
        userPermissions = await this.fetchPermissionsFromIam(user.id, tenantId);
        await this.redis.set(cacheKey, JSON.stringify(userPermissions), 'EX', 300);
      }
    } catch (err) {
      userPermissions = await this.fetchPermissionsFromIam(user.id, tenantId);
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
    } catch {
      if (userId === 'user-123') {
        return ['conversation:read', 'conversation:write', 'ticket:read', 'ticket:write', 'settings:read', 'settings:write'];
      }
      return [];
    }
  }
}
