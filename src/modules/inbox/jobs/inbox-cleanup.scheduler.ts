import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

/**
 * Producer for inbox maintenance. Every minute it enqueues a single cleanup
 * sweep that wakes due snoozes; the worker performs the work asynchronously so
 * the scheduler tick stays cheap and lock-free across instances.
 */
@Injectable()
export class InboxCleanupScheduler {
  private readonly logger = new Logger(InboxCleanupScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueCleanup(): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.INBOX, 'inbox-cleanup-job', {
        scheduledAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue inbox cleanup sweep: ${message}`);
    }
  }
}
