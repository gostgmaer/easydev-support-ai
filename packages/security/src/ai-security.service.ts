import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import { PiiProtectionService } from './pii-protection.service';

@Injectable()
export class AiSecurityService {
  private readonly redis: Redis;
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
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380', 10),
      maxRetriesPerRequest: 1,
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
    const key = `tenant:${tenantId}:ai:cost`;
    const costStr = await this.redis.get(key);
    const cost = costStr ? parseFloat(costStr) : 0;
    
    if (cost > limitDollars) {
      throw new ForbiddenException(`AI cost budget limit exceeded for tenant ${tenantId}. Current: $${cost}, Limit: $${limitDollars}`);
    }
  }

  async trackCost(tenantId: string, costDollars: number): Promise<void> {
    const key = `tenant:${tenantId}:ai:cost`;
    await this.redis.incrbyfloat(key, costDollars);
  }

  async checkRateLimit(tenantId: string, limitPerHour: number): Promise<void> {
    const key = `tenant:${tenantId}:ai:ratelimit:${new Date().getUTCHours()}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 3600);
    }
    if (current > limitPerHour) {
      throw new ForbiddenException(`AI platform rate limit exceeded for tenant ${tenantId}`);
    }
  }
}
