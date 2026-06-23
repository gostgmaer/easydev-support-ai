import { BaseClient } from './base-client';

export interface ValidateTokenResponse {
  isValid: boolean;
  userId: string;
  tenantId: string;
  roles: string[];
}

export interface TenantAdminInfo {
  email: string | null;
  role: string;
}

export class IamClient extends BaseClient {
  private readonly apiKey?: string;

  constructor(baseURL: string, apiKey?: string) {
    super(baseURL, 'IamClient');
    this.apiKey = apiKey;
  }

  async validateToken(token: string, tenantId: string): Promise<ValidateTokenResponse> {
    try {
      const response = await this.request<ValidateTokenResponse>({
        method: 'POST',
        url: '/auth/validate',
        data: { token, tenantId },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (e: any) {
      this.logger.error(`IAM validateToken error: ${e.message}`);
      return { isValid: false, userId: '', tenantId: '', roles: [] };
    }
  }

  async registerPermissions(payload: any): Promise<boolean> {
    try {
      await this.request({
        method: 'POST',
        url: '/api/v1/iam/rbac/permissions/register',
        data: payload,
      });
      return true;
    } catch (e: any) {
      this.logger.error(`IAM registerPermissions error: ${e.message}`);
      return false;
    }
  }

  /**
   * Calls IAM's GET /api/v1/iam/users/tenant-admins (TenantAdminsController) -
   * a global, non-tenant-scoped x-api-key, not a user's own Bearer token,
   * since this runs from backend-triggered jobs (e.g. quota enforcement)
   * with no end-user request in context. Returns [] (not a fabricated
   * default) on any failure, so the caller can decide its own fallback.
   */
  async getTenantAdmins(tenantId: string): Promise<TenantAdminInfo[]> {
    try {
      const response = await this.request<{
        tenantId: string;
        admins: TenantAdminInfo[];
      }>({
        method: 'GET',
        url: '/api/v1/iam/users/tenant-admins',
        params: { tenantId },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });
      return response.data.admins;
    } catch (e: any) {
      this.logger.error(`IAM getTenantAdmins error: ${e.message}`);
      return [];
    }
  }
}
