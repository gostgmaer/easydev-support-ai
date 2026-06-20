import { TenantContext } from '../src/tenant/tenant-context';

describe('TenantContext', () => {
  it('should resolve the tenant ID within the run block', () => {
    const tenantId = 'test-tenant-123';
    TenantContext.run(tenantId, () => {
      expect(TenantContext.getTenantId()).toBe(tenantId);
      expect(TenantContext.getRequiredTenantId()).toBe(tenantId);
    });
  });

  it('should throw an error if required tenant ID is accessed outside run block', () => {
    expect(TenantContext.getTenantId()).toBeUndefined();
    expect(() => TenantContext.getRequiredTenantId()).toThrow('Tenant context is missing or not set');
  });
});
