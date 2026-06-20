import { Injectable, ForbiddenException } from '@nestjs/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class TenantIsolationService {
  validateTenantContext(activeTenantId: string, resourceTenantId: string): void {
    if (!activeTenantId || !resourceTenantId || activeTenantId !== resourceTenantId) {
      throw new ForbiddenException(`Cross-tenant access violation: active tenant ${activeTenantId} attempted to access resource owned by ${resourceTenantId}`);
    }
  }

  enforceQuery(tenantId: string) {
    return sql`tenant_id = ${tenantId}`;
  }

  isolateCacheKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:cache:${key}`;
  }

  isolateStoragePath(tenantId: string, filePath: string): string {
    const cleanPath = filePath.replace(/^\/+/, '');
    return `tenants/${tenantId}/${cleanPath}`;
  }

  validateEventTenant(eventTenantId: string, activeTenantId: string): void {
    if (eventTenantId !== activeTenantId) {
      throw new ForbiddenException(`Event tenant context mismatch: Event owner ${eventTenantId} does not match processing context ${activeTenantId}`);
    }
  }
}
