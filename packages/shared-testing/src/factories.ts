import { v4 as uuidv4 } from 'uuid';

export function createTestTenant(overrides?: any) {
  return {
    id: uuidv4(),
    name: 'Test Tenant',
    slug: 'test-tenant',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestAuditLog(overrides?: any) {
  return {
    id: uuidv4(),
    tenantId: uuidv4(),
    userId: uuidv4(),
    action: 'CREATE',
    details: 'Created a resource',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestTenantUsage(overrides?: any) {
  return {
    id: uuidv4(),
    tenantId: uuidv4(),
    metric: 'CONVERSATIONS_COUNT',
    value: 5,
    resetAt: new Date(Date.now() + 86400 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestTenantLimit(overrides?: any) {
  return {
    id: uuidv4(),
    tenantId: uuidv4(),
    feature: 'CONVERSATIONS_LIMIT',
    maxValue: 100,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}
