import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@easydev/shared-queues';

@Injectable()
export class AuditEventPublisher {
  private readonly logger = new Logger(AuditEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(log: {
    tenantId: string;
    userId?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<void> {
    try {
      this.logger.debug(
        `Publishing Audit Event for Tenant ${log.tenantId}: ${log.action}`,
      );
      await this.queueService.addJob('analytics-queue', 'audit-event', log);
    } catch (e: any) {
      this.logger.error(`Failed to publish audit event: ${e.message}`);
    }
  }
}
