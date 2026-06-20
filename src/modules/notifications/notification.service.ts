import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendEmail(tenantId: string, to: string, templateId: string, data: any) {
    try {
      this.logger.log(
        `Dispatching email via EasyDev Notification Service to ${to}`,
      );
      // Integrates with EasyDev Notification Service
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/v1/email`, {
        tenant_id: tenantId,
        to,
        template_id: templateId,
        data,
      });
    } catch (e: any) {
      this.logger.error(`Failed to send email: ${e.message}`);
    }
  }

  async sendPushNotification(
    tenantId: string,
    userId: string,
    message: string,
  ) {
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/v1/push`, {
        tenant_id: tenantId,
        user_id: userId,
        message,
      });
    } catch (e: any) {
      this.logger.error(`Failed to send push notification: ${e.message}`);
    }
  }
}
