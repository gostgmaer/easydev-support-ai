import { BaseClient } from './base-client';

export class NotificationClient extends BaseClient {
  private readonly apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    super(baseURL, 'NotificationClient');
    this.apiKey = apiKey;
  }

  async sendEmail(
    tenantId: string,
    to: string,
    templateId: string,
    data: any,
  ): Promise<boolean> {
    try {
      await this.request({
        method: 'POST',
        url: '/v1/email',
        data: { tenant_id: tenantId, to, template_id: templateId, data },
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Notification sendEmail failed: ${e.message}`);
      return false;
    }
  }

  async sendSMS(
    tenantId: string,
    to: string,
    message: string,
  ): Promise<boolean> {
    try {
      await this.request({
        method: 'POST',
        url: '/v1/sms',
        data: { tenant_id: tenantId, to, message },
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Notification sendSMS failed: ${e.message}`);
      return false;
    }
  }

  async sendPush(
    tenantId: string,
    userId: string,
    title: string,
    body: string,
  ): Promise<boolean> {
    try {
      await this.request({
        method: 'POST',
        url: '/v1/push',
        data: { tenant_id: tenantId, user_id: userId, title, body },
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Notification sendPush failed: ${e.message}`);
      return false;
    }
  }
}
