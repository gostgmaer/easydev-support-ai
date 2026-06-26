import { Injectable, Logger } from '@nestjs/common';
import { NotificationClient } from '@easydev/shared-clients';

/**
 * Thin wrapper around NotificationClient (packages/shared-clients). Kept as
 * a separate NestJS service (rather than injecting NotificationClient
 * directly) so callers' retry/dead-letter semantics are preserved -
 * NotificationClient.sendEmail returns false on failure, this re-throws so
 * every caller's BaseWorker retry+DLQ wiring still fires the same way it
 * did before this was a thin wrapper.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly client: NotificationClient;

  constructor() {
    this.client = new NotificationClient(
      process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
      process.env.NOTIFICATION_SERVICE_API_KEY || '',
    );
  }

  /**
   * KNOWN GAP: `templateId` here is one of this app's own kebab-case names
   * (e.g. 'ticket-approval-request', 'sla-breach-manager') - none of these
   * exist in notification-service's template catalog today, which throws
   * "Email template not found" for any unknown name with no fallback.
   * Fixing that requires either registering these as custom templates over
   * there or remapping each call site to one of its existing templates - a
   * content decision for whoever owns that service's template library, not
   * something to guess at here.
   */
  async sendEmail(
    tenantId: string,
    to: string,
    templateId: string,
    data: any,
    tenantName?: string,
  ): Promise<void> {
    this.logger.log(
      `Dispatching email via EasyDev Notification Service to ${to}`,
    );
    const ok = await this.client.sendEmail(
      tenantId,
      to,
      templateId,
      data,
      tenantName,
    );
    if (!ok) {
      // Every real caller of this method (NotificationQueueProcessor's 16
      // job cases, AnalyticsExportService.triggerExport via
      // analytics-queue.processor.ts) is itself a BaseWorker subclass with
      // retry + dead-letter routing already wired and waiting - swallowing
      // here meant a transient notification-service outage caused
      // permanent, untraceable loss instead of a retry.
      throw new Error('Failed to send email via Notification Service');
    }
  }

  async sendPushNotification(
    tenantId: string,
    userId: string,
    message: string,
    tenantName?: string,
  ): Promise<void> {
    await this.client.sendPush(tenantId, userId, '', message, tenantName);
  }
}
