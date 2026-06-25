import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  // Was never sent despite being configured everywhere - every call to the
  // notification service went out completely unauthenticated.
  private readonly apiKey = process.env.NOTIFICATION_SERVICE_API_KEY || '';

  private get authHeaders() {
    return this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {};
  }

  async sendEmail(
    tenantId: string,
    to: string,
    templateId: string,
    data: any,
    tenantName?: string,
  ) {
    try {
      this.logger.log(
        `Dispatching email via EasyDev Notification Service to ${to}`,
      );
      // Verified directly against the real notification-service's
      // SendEmailDto/EmailController (a separate repo): the route is
      // POST /v1/email/send (not /v1/email), the DTO has no tenant_id/
      // tenant_name fields at all (tenant context goes in `metadata`,
      // which it stores with the log but never sends in the email), and
      // the template field is `template` (a name resolved against that
      // service's own template catalog), not `template_id`.
      //
      // KNOWN GAP: `templateId` here is one of this app's own kebab-case
      // names (e.g. 'ticket-approval-request', 'sla-breach-manager') -
      // none of these exist in notification-service's template catalog
      // today, which throws "Email template not found" for any unknown
      // name with no fallback. Fixing that requires either registering
      // these as custom templates over there or remapping each call site
      // to one of its existing templates - a content decision for
      // whoever owns that service's template library, not something to
      // guess at here.
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/v1/email/send`,
        {
          to,
          template: templateId,
          data,
          metadata: {
            tenantId,
            ...(tenantName ? { tenantName } : {}),
          },
        },
        { headers: this.authHeaders },
      );
    } catch (e: any) {
      this.logger.error(`Failed to send email: ${e.message}`);
      // Every real caller of this method (NotificationQueueProcessor's 16
      // job cases, AnalyticsExportService.triggerExport via
      // analytics-queue.processor.ts) is itself a BaseWorker subclass with
      // retry + dead-letter routing already wired and waiting - swallowing
      // here meant a transient notification-service outage caused permanent,
      // untraceable loss instead of a retry.
      throw e;
    }
  }

  async sendPushNotification(
    tenantId: string,
    userId: string,
    message: string,
    tenantName?: string,
  ) {
    // The real notification-service (a separate repo) has no push channel
    // at all - only /v1/email/* and /v1/sms/* controllers exist. Every call
    // here previously 404'd, got retried by the caller's BaseWorker logic,
    // and eventually landed in the dead-letter queue - permanent, repeated
    // failure for something that can never succeed, not a transient outage.
    // No-op with a clear log instead until a real push channel exists
    // somewhere (this service, or a dedicated push provider).
    this.logger.warn(
      `Push notification to user ${userId} (tenant ${tenantId}${tenantName ? ` / ${tenantName}` : ''}) skipped - notification-service has no push channel: "${message}"`,
    );
  }
}
