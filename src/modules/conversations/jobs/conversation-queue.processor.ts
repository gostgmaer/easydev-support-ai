import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BaseWorker,
  QueueService,
  QUEUES,
  WORKER_OPTIONS,
} from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { ConversationService } from '../services/conversation.service';
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import { ConversationSummaryService } from '../services/conversation-summary.service';
import { InboxService } from '../services/inbox.service';
import { AiResponseService } from '../../ai-integration/services/ai-response.service';

@Processor('conversation-queue', WORKER_OPTIONS)
@Injectable()
export class ConversationQueueProcessor extends BaseWorker {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly assignmentService: ConversationAssignmentService,
    private readonly summaryService: ConversationSummaryService,
    private readonly inboxService: InboxService,
    private readonly aiResponseService: AiResponseService,
    @Optional() queueService?: QueueService,
  ) {
    super('ConversationQueueProcessor', QUEUES.CONVERSATION, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    // Every job type here except the offline-reassignment sweep (genuinely
    // cross-tenant by design) operates on tenant-scoped data -- a warning
    // alone let the job proceed with tenantId=undefined into a downstream
    // repository query, which could silently drop its tenant filter instead
    // of failing loudly. Throw so BullMQ marks the job failed/retryable
    // instead of quietly executing with unknown tenant scope.
    if (!tenantId && job.name !== 'agent-offline-reassignment-job') {
      throw new Error(
        `Job ${job.id} [${job.name}] has no tenantId context -- refusing to process`,
      );
    }

    switch (job.name) {
      case 'conversation-assignment-job': {
        this.logger.log(`Processing conversation-assignment-job ${job.id}`);
        const conversation = await this.assignmentService.autoAssign(
          tenantId,
          job.data.conversationId,
          job.data.teamId,
          job.data.userId,
        );
        return {
          conversationId: conversation.id,
          assignedAgentId: conversation.assignedAgentId,
        };
      }

      case 'conversation-summary-job': {
        this.logger.log(`Processing conversation-summary-job ${job.id}`);
        const summary = await this.summaryService.rebuild(
          tenantId,
          job.data.conversationId,
        );
        await this.inboxService.invalidate(tenantId);
        return { rebuilt: !!summary, conversationId: job.data.conversationId };
      }

      case 'conversation-merge-job': {
        this.logger.log(`Processing conversation-merge-job ${job.id}`);
        const target = await this.conversationService.merge(
          tenantId,
          job.data.sourceId,
          job.data.targetId,
          job.data.userId,
        );
        return { targetId: target.id };
      }

      case 'conversation-archive-job': {
        this.logger.log(`Processing conversation-archive-job ${job.id}`);
        const archived = await this.conversationService.archive(
          tenantId,
          job.data.conversationId,
          job.data.userId,
        );
        return { conversationId: archived.id, status: archived.status.value };
      }

      case 'ai-process-message': {
        this.logger.log(`Processing ai-process-message job ${job.id}`);
        // Whether the AI platform is reachable affects every attempt
        // equally - a customer-facing "we're having trouble" message must
        // only ever be sent once, on the final attempt, not once per retry.
        const maxAttempts = job.opts.attempts ?? 1;
        const isLastAttempt = job.attemptsMade + 1 >= maxAttempts;
        return this.aiResponseService.processInboundMessage(
          tenantId,
          job.data.messageId,
          job.data.conversationId,
          job.data.messageText,
          isLastAttempt,
        );
      }

      case 'agent-offline-reassignment-job': {
        this.logger.log(`Processing agent-offline-reassignment-job ${job.id}`);
        return this.assignmentService.reassignFromOfflineAgents(tenantId);
      }

      case 'conversation-analytics-job': {
        this.logger.log(`Processing conversation-analytics-job ${job.id}`);
        await this.queueService?.addJob(
          QUEUES.ANALYTICS,
          'conversation-event',
          {
            conversationId: job.data.conversationId,
            eventName: job.data.eventName,
            tenantId,
          },
        );
        return { forwarded: true, conversationId: job.data.conversationId };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
