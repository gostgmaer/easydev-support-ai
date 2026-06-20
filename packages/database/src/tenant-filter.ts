import { eq, and } from 'drizzle-orm';
import { TenantContext } from '@easydev/shared-kernel';

export function tenantFilter(table: any, queryCondition?: any) {
  const tenantId = TenantContext.getRequiredTenantId();
  const tenantCondition = eq(table.tenantId, tenantId);
  return queryCondition ? and(tenantCondition, queryCondition) : tenantCondition;
}
