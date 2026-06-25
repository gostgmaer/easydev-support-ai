'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.tenantFilter = tenantFilter;
const drizzle_orm_1 = require('drizzle-orm');
const shared_kernel_1 = require('@easydev/shared-kernel');
function tenantFilter(table, queryCondition) {
  const tenantId = shared_kernel_1.TenantContext.getRequiredTenantId();
  const tenantCondition = (0, drizzle_orm_1.eq)(table.tenantId, tenantId);
  return queryCondition
    ? (0, drizzle_orm_1.and)(tenantCondition, queryCondition)
    : tenantCondition;
}
