import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { IChannelRepository } from '../repositories/channel-repository.interface';
import { ChannelConnectorRegistry } from '../connectors/channel-connector.registry';
import { ChannelEventPublisher } from './channel-event.publisher';
import { QueueService } from '@easydev/shared-queues';
import { AuditService } from '../../audit/audit.service';
import { ChannelRateLimit } from '../domain/channel-rate-limit.entity';
import { randomUUID } from 'crypto';
import {
  MessageReceivedEvent,
  MessageNormalizedEvent,
  MessageSentEvent,
  MessageFailedEvent,
} from '@easydev/shared-events';

@Injectable()
export class ChannelMessageService {
  private readonly logger = new Logger(ChannelMessageService.name);

  constructor(
    @Inject('IChannelRepository')
    private readonly channelRepo: IChannelRepository,
    private readonly connectorRegistry: ChannelConnectorRegistry,
    private readonly eventPublisher: ChannelEventPublisher,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService
  ) {}

  async processIncomingWebhook(tenantId: string, channelId: string, payload: any, headers: Record<string, any>): Promise<void> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    // 1. Rate Limiting Check
    let rateLimit = await this.channelRepo.findRateLimitByChannelId(channelId, tenantId);
    if (!rateLimit) {
      rateLimit = new ChannelRateLimit(randomUUID(), {
        tenantId,
        channelId,
        providerLimit: 100,
        tenantLimit: 50,
        resetAt: new Date(Date.now() + 60000),
      });
    }

    if (rateLimit.isRateLimited()) {
      throw new BadRequestException('Rate limit exceeded for this channel');
    }

    rateLimit.incrementUsage();
    await this.channelRepo.saveRateLimit(rateLimit, tenantId);

    // 2. Normalization
    const connector = this.connectorRegistry.getConnector(channel.type.value);
    const normalized = await connector.normalizeMessage(tenantId, channelId, payload);

    // 3. Spam Detection Hook (Basic spam check structure based on content metadata)
    const isSpam = this.checkForSpam(normalized.content);
    if (isSpam) {
      this.logger.warn(`Spam message detected for channel ${channelId}: ${normalized.content}`);
      return; // Drop message silently or flag it
    }

    // 4. Publish Event
    const messageId = normalized.externalMessageId || randomUUID();
    await this.eventPublisher.publish(
      new MessageReceivedEvent(tenantId, messageId, randomUUID(), normalized.content, 'CUSTOMER')
    );
    await this.eventPublisher.publish(
      new MessageNormalizedEvent(tenantId, messageId, channelId, payload, normalized)
    );

    // 5. Audit Logging
    await this.auditService.log({
      tenantId,
      action: 'MESSAGE_RECEIVE',
      details: `Received message ${messageId} on channel ${channelId}`,
    });
  }

  async sendOutgoingMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    content: any,
    options?: { templateName?: string; variables?: Record<string, any> }
  ): Promise<void> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    let finalContent = content;

    // Resolve template if requested
    if (options?.templateName) {
      const template = await this.channelRepo.findTemplateByName(channelId, options.templateName, tenantId);
      if (!template) {
        throw new NotFoundException(`Template ${options.templateName} not found`);
      }
      finalContent = this.resolveTemplateContent(template.templateContent, options.variables || {});
    }

    // Push to outgoing queue
    await this.queueService.addJob(
      'channel-queue',
      'outgoing-message-job',
      {
        channelId,
        recipientId,
        content: finalContent,
      }
    );

    await this.auditService.log({
      tenantId,
      action: 'MESSAGE_OUTGOING_ENQUEUE',
      details: `Enqueued outgoing message for channel ${channelId} to ${recipientId}`,
    });
  }

  async deliverOutgoingMessage(tenantId: string, channelId: string, recipientId: string, content: any): Promise<void> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    const connector = this.connectorRegistry.getConnector(channel.type.value);

    try {
      const formatted = await connector.formatOutgoingMessage(tenantId, channelId, content);
      const deliveryResult = await connector.sendMessage(tenantId, channelId, recipientId, formatted);

      if (deliveryResult.status === 'SENT') {
        await this.eventPublisher.publish(
          new MessageSentEvent(tenantId, deliveryResult.messageId, randomUUID(), typeof content === 'string' ? content : JSON.stringify(content), recipientId)
        );
      } else {
        throw new Error(deliveryResult.error || 'Delivery failed');
      }
    } catch (err: any) {
      const messageId = randomUUID();
      await this.eventPublisher.publish(
        new MessageFailedEvent(tenantId, messageId, channelId, err.message)
      );
      throw err; // propagates to queue processor for retries/DLQ
    }
  }

  private checkForSpam(content: string): boolean {
    // Basic spam detector: check for common trigger patterns or links
    if (!content) return false;
    const spamWords = ['buy crypto', 'win free ticket', 'lottery winner', 'casino bonus'];
    return spamWords.some((word) => content.toLowerCase().includes(word));
  }

  private resolveTemplateContent(content: string, variables: Record<string, any>): string {
    let resolved = content;
    for (const [key, val] of Object.entries(variables)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
    }
    return resolved;
  }
}
