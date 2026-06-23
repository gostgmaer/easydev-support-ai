import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

/**
 * Producer for the approval-timeout sweep. Mirrors SlaMonitorScheduler's
 * pattern: every 5 minutes, enqueue one cheap sweep job; the worker does the
 * actual cross-tenant scan for expired pending approvals.
 */
@Injectable()
export class WorkflowApprovalTimeoutScheduler {
  private readonly logger = new Logger(WorkflowApprovalTimeoutScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron('*/5 * * * *')
  async enqueueSweep(): Promise<void> {
    try {
      await this.queueService.addJob(
        QUEUES.WORKFLOW,
        'workflow-approval-timeout-job',
        { scheduledAt: new Date().toISOString() },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue approval-timeout sweep: ${message}`);
    }
  }
}
