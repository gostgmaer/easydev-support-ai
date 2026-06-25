export declare class TenantContext {
  private static storage;
  static run<R>(tenantId: string, callback: () => R): R;
  static getTenantId(): string | undefined;
  static getRequiredTenantId(): string;
}
