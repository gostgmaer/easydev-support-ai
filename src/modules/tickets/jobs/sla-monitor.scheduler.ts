import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

/**
 * Producer for the SLA monitor. Every minute it enqueues a single sla-monitor
 * sweep job onto the ticket queue; the worker performs breach detection and
 * escalation asynchronously, keeping the scheduler tick cheap and lock-free.
 */
@Injectable()
export class SlaMonitorScheduler {
  private readonly logger = new Logger(SlaMonitorScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueSweep(): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.TICKET, 'sla-monitor-job', {
        scheduledAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue SLA monitor sweep: ${message}`);
    }
  }
}
