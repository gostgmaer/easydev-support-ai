import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<string>();

  public static run<R>(tenantId: string, callback: () => R): R {
    return this.storage.run(tenantId, callback);
  }

  public static getTenantId(): string | undefined {
    return this.storage.getStore();
  }

  public static getRequiredTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('Tenant context is missing or not set');
    }
    return tenantId;
  }
}
