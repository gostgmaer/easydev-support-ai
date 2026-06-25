import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

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
      // Integrates with EasyDev Notification Service. tenant_id remains the
      // stable key the Notification Service actually uses; tenant_name is
      // purely so tenant activity is identifiable at a glance in its logs.
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/v1/email`, {
        tenant_id: tenantId,
        ...(tenantName ? { tenant_name: tenantName } : {}),
        to,
        template_id: templateId,
        data,
      });
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
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/v1/push`, {
        tenant_id: tenantId,
        ...(tenantName ? { tenant_name: tenantName } : {}),
        user_id: userId,
        message,
      });
    } catch (e: any) {
      this.logger.error(`Failed to send push notification: ${e.message}`);
      throw e;
    }
  }
}
