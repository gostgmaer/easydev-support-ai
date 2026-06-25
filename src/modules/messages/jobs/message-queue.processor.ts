import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BaseWorker,
  QueueService,
  QUEUES,
  WORKER_OPTIONS,
} from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { MessageDeliveryService } from '../services/message-delivery.service';
import { MessageAttachmentService } from '../services/message-attachment.service';
import { MessageDraftService } from '../services/message-draft.service';
import { MessageInboundService } from '../services/message-inbound.service';

@Processor('message-queue', WORKER_OPTIONS)
@Injectable()
export class MessageQueueProcessor extends BaseWorker {
  constructor(
    private readonly deliveryService: MessageDeliveryService,
    private readonly attachmentService: MessageAttachmentService,
    private readonly draftService: MessageDraftService,
    private readonly inboundService: MessageInboundService,
    @Optional() queueService?: QueueService,
  ) {
    super('MessageQueueProcessor', QUEUES.MESSAGE, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    if (!tenantId) {
      this.logger.warn(
        `Job ${job.id} [${job.name}] ran without tenantId context`,
      );
    }

    switch (job.name) {
      case 'message-send-job': {
        this.logger.log(`Processing message-send-job ${job.id}`);
        const message = await this.deliveryService.dispatch(
          tenantId,
          job.data.messageId,
        );
        return { messageId: message.id, status: message.status.value };
      }

      case 'message-delivery-job': {
        this.logger.log(`Processing message-delivery-job ${job.id}`);
        const message = await this.deliveryService.applyDeliveryReceipt(
          tenantId,
          job.data.messageId,
          job.data.status,
          job.data.providerMessageId,
          job.data.failureReason,
        );
        return { messageId: message.id, status: message.status.value };
      }

      case 'message-retry-job': {
        this.logger.log(`Processing message-retry-job ${job.id}`);
        const message = await this.deliveryService.retry(
          tenantId,
          job.data.messageId,
        );
        return { messageId: message.id, status: message.status.value };
      }

      case 'attachment-processing-job': {
        this.logger.log(`Processing attachment-processing-job ${job.id}`);
        await this.attachmentService.process(tenantId, job.data.attachmentId);
        return { processed: true, attachmentId: job.data.attachmentId };
      }

      case 'draft-cleanup-job': {
        this.logger.log(`Processing draft-cleanup-job ${job.id}`);
        return this.draftService.cleanupExpired(tenantId);
      }

      case 'message-inbound-job': {
        this.logger.log(`Processing message-inbound-job ${job.id}`);
        return this.inboundService.ingest(tenantId, job.data.payload);
      }

      case 'message-analytics-job': {
        this.logger.log(`Processing message-analytics-job ${job.id}`);
        await this.queueService?.addJob(QUEUES.ANALYTICS, 'message-event', {
          messageId: job.data.messageId,
          eventName: job.data.eventName,
          tenantId,
        });
        return { forwarded: true, messageId: job.data.messageId };
      }

      case 'ai-workflow-trigger-job': {
        this.logger.log(`Processing ai-workflow-trigger-job ${job.id}`);
        // Hands off to the AI workflow platform (/v1/workflows/run) via the
        // shared workflow queue. No AI logic is executed here.
        await this.queueService?.addJob(QUEUES.WORKFLOW, 'run-workflow', {
          trigger: 'MESSAGE_RECEIVED',
          messageId: job.data.messageId,
          conversationId: job.data.conversationId,
          tenantId,
        });
        return { triggered: true, messageId: job.data.messageId };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
