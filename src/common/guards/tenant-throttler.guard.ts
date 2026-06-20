import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limits requests per tenant and per client IP so that one tenant's
 * traffic cannot exhaust another tenant's budget. Falls back to `public` for
 * unauthenticated / tenant-less routes (e.g. health checks).
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const tenantId =
      (req.headers?.['x-tenant-id'] as string | undefined) ??
      (req.tenantId as string | undefined) ??
      'public';
    const ip: string =
      Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : req.ip;
    return `${tenantId}:${ip}`;
  }
}
