import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

/**
 * Producer for the offline agent monitor. Sweeps for offline agents and
 * enqueues a job to reassign their tickets back into active queues.
 */
@Injectable()
export class OfflineAgentScheduler {
  private readonly logger = new Logger(OfflineAgentScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueSweep(): Promise<void> {
    try {
      await this.queueService.addJob(
        QUEUES.TICKET,
        'agent-offline-reassignment-job',
        {
          scheduledAt: new Date().toISOString(),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to enqueue offline agent reassignment sweep: ${message}`,
      );
    }
  }
}
