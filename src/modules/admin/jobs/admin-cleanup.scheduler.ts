import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class AdminCleanupScheduler {
  private readonly logger = new Logger(AdminCleanupScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async enqueueCleanup(): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.ADMIN, 'admin-cleanup-job', {
        scheduledAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue admin cleanup sweep: ${message}`);
    }
  }
}
