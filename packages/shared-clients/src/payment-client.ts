import { BaseClient } from './base-client';

export interface SubscriptionStatus {
  tenantId: string;
  plan: 'STARTER' | 'GROWTH' | 'BUSINESS' | 'ENTERPRISE';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  quotaLimits: {
    conversations: number;
    agents: number;
    knowledgeBaseKb: number;
    workflows: number;
  };
}

export class PaymentClient extends BaseClient {
  private readonly apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    super(baseURL, 'PaymentClient');
    this.apiKey = apiKey;
  }

  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
    try {
      const response = await this.request<SubscriptionStatus>({
        method: 'GET',
        url: `/v1/billing/subscriptions/status`,
        params: { tenant_id: tenantId },
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.data;
    } catch (e: any) {
      this.logger.error(`Payment getSubscriptionStatus failed: ${e.message}`);
      return {
        tenantId,
        plan: 'STARTER',
        status: 'ACTIVE',
        quotaLimits: {
          conversations: 1000,
          agents: 3,
          knowledgeBaseKb: 50000,
          workflows: 5,
        }
      };
    }
  }
}
