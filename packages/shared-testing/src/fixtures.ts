/**
 * Deterministic fixtures for the foundation layer. Unlike factories (which mint
 * random data), fixtures use stable identifiers so assertions can reference them
 * directly across tests.
 */

export const FIXTURE_TENANT_A = '11111111-1111-4111-8111-111111111111';
export const FIXTURE_TENANT_B = '22222222-2222-4222-8222-222222222222';
export const FIXTURE_USER_A = '33333333-3333-4333-8333-333333333333';
export const FIXTURE_USER_B = '44444444-4444-4444-8444-444444444444';

export interface AuditLogFixture {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdBy: string;
}

export const auditLogFixture: AuditLogFixture = {
  id: '55555555-5555-4555-8555-555555555555',
  tenantId: FIXTURE_TENANT_A,
  userId: FIXTURE_USER_A,
  action: 'CREATE',
  details: 'Fixture audit log entry',
  ipAddress: '203.0.113.10',
  userAgent: 'jest-fixture/1.0',
  createdBy: FIXTURE_USER_A,
};

export interface TenantLimitFixture {
  id: string;
  tenantId: string;
  feature: string;
  maxValue: number;
  isActive: boolean;
}

export const tenantLimitFixture: TenantLimitFixture = {
  id: '66666666-6666-4666-8666-666666666666',
  tenantId: FIXTURE_TENANT_A,
  feature: 'CONVERSATIONS_LIMIT',
  maxValue: 1000,
  isActive: true,
};

export interface TenantUsageFixture {
  id: string;
  tenantId: string;
  metric: string;
  value: number;
  resetAt: Date;
}

export const tenantUsageFixture: TenantUsageFixture = {
  id: '77777777-7777-4777-8777-777777777777',
  tenantId: FIXTURE_TENANT_A,
  metric: 'CONVERSATIONS_COUNT',
  value: 42,
  resetAt: new Date('2030-01-01T00:00:00.000Z'),
};
