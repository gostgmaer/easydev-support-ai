import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

/**
 * Producer for the agent-offline reassignment sweep. Mirrors
 * SlaMonitorScheduler's pattern: every 2 minutes, enqueue one cheap sweep job
 * each onto the conversation and ticket queues; the workers do the actual
 * cross-referencing (offline agents -> their active work -> reassign)
 * asynchronously.
 */
@Injectable()
export class AgentOfflineReassignmentScheduler {
  private readonly logger = new Logger(AgentOfflineReassignmentScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron('*/2 * * * *')
  async enqueueSweep(): Promise<void> {
    try {
      await this.queueService.addJob(
        QUEUES.CONVERSATION,
        'agent-offline-reassignment-job',
        { scheduledAt: new Date().toISOString() },
      );
      await this.queueService.addJob(
        QUEUES.TICKET,
        'agent-offline-reassignment-job',
        { scheduledAt: new Date().toISOString() },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to enqueue agent-offline reassignment sweep: ${message}`,
      );
    }
  }
}
