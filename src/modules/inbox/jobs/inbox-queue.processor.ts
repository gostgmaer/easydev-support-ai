import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { InboxEventConsumer } from '../consumers/inbox-event.consumer';
import { InboxSnoozeService } from '../services/inbox-snooze.service';
import { InboxSearchService } from '../services/inbox-search.service';
import { InboxPresenceService } from '../services/inbox-presence.service';
import { PresenceStatusEnum } from '../domain/value-objects';

@Processor('inbox-queue')
@Injectable()
export class InboxQueueProcessor extends BaseWorker {
  constructor(
    private readonly eventConsumer: InboxEventConsumer,
    private readonly snoozeService: InboxSnoozeService,
    private readonly searchService: InboxSearchService,
    private readonly presenceService: InboxPresenceService,
    @Optional() queueService?: QueueService,
  ) {
    super('InboxQueueProcessor', QUEUES.INBOX, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'inbox-projection-job': {
        this.logger.log(`Processing inbox-projection-job ${job.id}`);
        await this.eventConsumer.handleEvent({
          tenantId,
          eventName: job.data.eventName,
          aggregateId: job.data.aggregateId,
          conversationId: job.data.conversationId,
          actorId: job.data.actorId,
          timestamp: job.data.timestamp,
          payload: job.data.payload,
        });
        return { projected: true };
      }

      case 'inbox-search-index-job': {
        this.logger.log(`Processing inbox-search-index-job ${job.id}`);
        return this.searchService.invalidateTenant(tenantId);
      }

      case 'inbox-presence-job': {
        this.logger.log(`Processing inbox-presence-job ${job.id}`);
        if (job.data.userId && job.data.status) {
          const presence = await this.presenceService.setPresence(
            tenantId,
            job.data.userId,
            job.data.status as PresenceStatusEnum,
            job.data.activeConversationId,
          );
          return { userId: presence.userId, status: presence.status.value };
        }
        if (job.data.userId) {
          await this.presenceService.heartbeat(tenantId, job.data.userId);
          return { userId: job.data.userId, heartbeat: true };
        }
        return { skipped: true };
      }

      case 'inbox-cleanup-job': {
        this.logger.log(`Processing inbox-cleanup-job ${job.id}`);
        return this.snoozeService.processDueSnoozes(job.data.tenantId);
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
