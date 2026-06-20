import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker } from '@easydev/shared-queues';
import { Injectable } from '@nestjs/common';
import { ChannelMessageService } from '../services/channel-message.service';
import { ChannelHealthService } from '../services/channel-health.service';

@Processor('channel-queue')
@Injectable()
export class ChannelQueueProcessor extends BaseWorker {
  constructor(
    private readonly messageService: ChannelMessageService,
    private readonly healthService: ChannelHealthService
  ) {
    super('ChannelQueueProcessor');
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    if (!tenantId) {
      this.logger.warn(`Job ${job.id} [${job.name}] ran without tenantId context`);
    }

    switch (job.name) {
      case 'incoming-message-job':
        this.logger.log(`Processing incoming-message-job ${job.id}`);
        return this.messageService.processIncomingWebhook(
          tenantId,
          job.data.channelId,
          job.data.payload,
          job.data.headers
        );

      case 'outgoing-message-job':
        this.logger.log(`Processing outgoing-message-job ${job.id}`);
        return this.messageService.deliverOutgoingMessage(
          tenantId,
          job.data.channelId,
          job.data.recipientId,
          job.data.content
        );

      case 'channel-health-job':
        this.logger.log(`Processing channel-health-job ${job.id}`);
        return this.healthService.checkHealth(tenantId, job.data.channelId);

      case 'template-sync-job':
        this.logger.log(`Processing template-sync-job ${job.id}`);
        // Log sync success as mock provider template syncing
        return { synced: true, timestamp: new Date() };

      case 'delivery-status-job':
        this.logger.log(`Processing delivery-status-job ${job.id} for msg ${job.data.messageId}`);
        return { status: 'DELIVERED', messageId: job.data.messageId };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
