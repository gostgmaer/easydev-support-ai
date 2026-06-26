import { BaseClient, AuthProbeResult } from './base-client';

export class NotificationClient extends BaseClient {
  private readonly apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    super(baseURL, 'NotificationClient');
    this.apiKey = apiKey;
  }

  private get authHeader() {
    return this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {};
  }

  /**
   * Verified directly against the real notification-service's
   * SendEmailDto/EmailController (a separate repo): route is
   * POST /v1/email/send, no tenant_id/template_id fields exist - tenant
   * context goes in `metadata` (stored with the log, never sent in the
   * email), and the template field is `template` (a name resolved against
   * that service's own template catalog), not `template_id`.
   */
  async sendEmail(
    tenantId: string,
    to: string,
    templateId: string,
    data: any,
    tenantName?: string,
  ): Promise<boolean> {
    try {
      await this.request({
        method: 'POST',
        url: '/v1/email/send',
        data: {
          to,
          template: templateId,
          data,
          metadata: { tenantId, ...(tenantName ? { tenantName } : {}) },
        },
        headers: this.authHeader,
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Notification sendEmail failed: ${e.message}`);
      return false;
    }
  }

  /** Verified against the real service's SMS controller - route is
   * POST /v1/sms/send, same tenant-in-metadata convention as email. */
  async sendSMS(
    tenantId: string,
    to: string,
    message: string,
    tenantName?: string,
  ): Promise<boolean> {
    try {
      await this.request({
        method: 'POST',
        url: '/v1/sms/send',
        data: {
          to,
          message,
          metadata: { tenantId, ...(tenantName ? { tenantName } : {}) },
        },
        headers: this.authHeader,
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Notification sendSMS failed: ${e.message}`);
      return false;
    }
  }

  /**
   * KNOWN GAP: the real notification-service has no push channel at all
   * (verified against its source - only email and SMS controllers exist).
   * Always returns false with a clear log instead of calling a route that
   * doesn't exist, until a real push channel exists somewhere.
   */
  sendPush(
    tenantId: string,
    userId: string,
    _title: string,
    body: string,
    tenantName?: string,
  ): Promise<boolean> {
    this.logger.warn(
      `Push notification to user ${userId} (tenant ${tenantId}${tenantName ? ` / ${tenantName}` : ''}) skipped - notification-service has no push channel: "${body}"`,
    );
    return Promise.resolve(false);
  }

  /**
   * Exercises this client's actual auth path (Bearer api-key) against
   * GET /v1/health/detailed - a real, read-only, non-@Public() endpoint
   * gated by the same ApiKeyGuard the send routes use, so it proves
   * credentials work without sending an actual email/SMS.
   */
  async checkAuth(): Promise<AuthProbeResult> {
    return this.probeAuth({
      method: 'GET',
      url: '/v1/health/detailed',
      headers: this.authHeader,
    });
  }
}
