import { BaseClient } from './base-client';
import { AiResponseContract } from '@easydev/shared-contracts';

export class AiPlatformClient extends BaseClient {
  private readonly apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    super(baseURL, 'AiPlatformClient');
    this.apiKey = apiKey;
  }

  async classifyIntent(
    tenantId: string,
    content: string,
  ): Promise<AiResponseContract> {
    const response = await this.request<AiResponseContract>({
      method: 'POST',
      url: '/v1/classify',
      data: { tenant_id: tenantId, content },
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.data;
  }

  async generateResponse(
    tenantId: string,
    conversationHistory: any[],
  ): Promise<string> {
    const response = await this.request<{ response: string }>({
      method: 'POST',
      url: '/v1/generate',
      data: { tenant_id: tenantId, history: conversationHistory },
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.data.response;
  }

  async ingestDocument(
    tenantId: string,
    url: string,
    type: string,
  ): Promise<{ jobId: string }> {
    const response = await this.request<{ jobId: string }>({
      method: 'POST',
      url: '/v1/documents/ingest',
      data: { tenant_id: tenantId, url, type },
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.data;
  }
}
