import { BaseClient } from './base-client';

export interface ValidateTokenResponse {
  isValid: boolean;
  userId: string;
  tenantId: string;
  roles: string[];
}

export class IamClient extends BaseClient {
  constructor(baseURL: string) {
    super(baseURL, 'IamClient');
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
}
