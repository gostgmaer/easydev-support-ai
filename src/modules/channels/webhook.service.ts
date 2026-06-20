import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NormalizationService } from './normalization.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectQueue('inbound-messages') private readonly incomingQueue: Queue,
    private readonly normalizationService: NormalizationService,
  ) {}

  async processIncomingWebhook(tenantId: string, provider: string, payload: any, signature: string) {
    // 1. Verify Signature (Security)
    this.validateSignature(provider, payload, signature);

    // 2. Normalize the raw provider payload into our internal standard
    const normalizedMessage = this.normalizationService.normalize(provider, payload);
    
    if (!normalizedMessage) {
      this.logger.warn(`Could not normalize message for provider ${provider}`);
      return;
    }

    // 3. Add tenant context
    const queuePayload = {
      tenantId,
      provider,
      message: normalizedMessage,
      rawPayload: payload,
    };

    // 4. Dispatch to BullMQ for the AI Pipeline to pick up
    await this.incomingQueue.add('process-message', queuePayload, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    this.logger.log(`Dispatched message to queue for tenant ${tenantId}`);
  }

  private validateSignature(provider: string, payload: any, signature: string) {
    // Implement HMAC SHA256 validation based on channel configuration secrets
    // E.g., for WhatsApp, Stripe, Slack, etc.
    return true; 
  }
}
