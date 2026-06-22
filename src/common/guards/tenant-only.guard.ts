import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Validates only that a tenant context is present - no IAM identity required.
 * For endpoints anonymous callers (the Customer Widget, Help Center, and any
 * pre-login page in the authenticated apps) must reach without ever holding an
 * IAM bearer token: tenant-scoped feature-flag reads, client telemetry ingestion.
 * Contrast with TenantGuard, which requires a real IAM session and is for routes
 * that need to know who the caller is, not just which tenant.
 */
@Injectable()
export class TenantOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    return true;
  }
}
