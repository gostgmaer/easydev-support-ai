import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { ConversationService } from '../services/conversation.service';
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import { ConversationSummaryService } from '../services/conversation-summary.service';
import { InboxService } from '../services/inbox.service';
import { ConversationsGateway } from '../conversations.gateway';
import { AiResponseService } from '../../ai-integration/services/ai-response.service';

@Processor('conversation-queue')
@Injectable()
export class ConversationQueueProcessor extends BaseWorker {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly assignmentService: ConversationAssignmentService,
    private readonly summaryService: ConversationSummaryService,
    private readonly inboxService: InboxService,
    private readonly aiResponseService: AiResponseService,
    @Optional() private readonly gateway?: ConversationsGateway,
    @Optional() queueService?: QueueService,
  ) {
    super('ConversationQueueProcessor', QUEUES.CONVERSATION, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    if (!tenantId) {
      this.logger.warn(
        `Job ${job.id} [${job.name}] ran without tenantId context`,
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
        if (summary) {
          this.gateway?.broadcastInboxUpdate(tenantId, summary.toJSON());
        }
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
        return this.aiResponseService.processInboundMessage(
          tenantId,
          job.data.messageId,
          job.data.conversationId,
          job.data.messageText,
        );
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
