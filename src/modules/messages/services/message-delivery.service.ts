import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import type { IMessageRepository } from '../repositories/message-repository.interface';
import { Message } from '../domain/message.aggregate';
import { MessageDeliveryStatus } from '../domain/message-delivery-status.entity';
import { MessageStatusEnum } from '../domain/value-objects';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { MessageTemplateService } from './message-template.service';
import { ChannelMessageService } from '../../channels/services/channel-message.service';
import { AuditService } from '../../audit/audit.service';

export interface SendOptions {
  templateName?: string;
  variables?: Record<string, any>;
  channelId?: string;
}

@Injectable()
export class MessageDeliveryService {
  private readonly logger = new Logger(MessageDeliveryService.name);

  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepo: IMessageRepository,
    private readonly queueService: QueueService,
    private readonly eventPublisher: MessageEventPublisher,
    private readonly readModel: MessageReadModelService,
    private readonly templateService: MessageTemplateService,
    private readonly channelMessageService: ChannelMessageService,
    private readonly auditService: AuditService,
  ) {}

  private async persist(message: Message, tenantId: string): Promise<void> {
    await this.messageRepo.save(message, tenantId);
    await this.eventPublisher.publishAll(message.domainEvents);
    message.clearEvents();
  }

  private async getOrThrow(tenantId: string, id: string): Promise<Message> {
    const message = await this.messageRepo.findById(id, tenantId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }
    return message;
  }

  /**
   * Entry point from the HTTP layer. Resolves an optional template, marks the
   * message for processing and hands delivery to the queue. The provider call
   * never runs inside the HTTP request.
   */
  async queueSend(
    tenantId: string,
    messageId: string,
    options: SendOptions = {},
    userId?: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, messageId);
    if (message.direction.isInbound()) {
      throw new BadRequestException('Inbound messages cannot be sent');
    }

    if (options.templateName) {
      const rendered = await this.templateService.render(
        tenantId,
        options.templateName,
        options.variables || {},
      );
      message.editContent(rendered);
    }

    message.markProcessing();
    await this.persist(message, tenantId);

    await this.queueService.addJob(QUEUES.MESSAGE, 'message-send-job', {
      messageId,
      channelId: options.channelId || message.channelId,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_SEND_ENQUEUE',
      details: `Enqueued message ${messageId} for delivery`,
    });

    return message;
  }

  /**
   * Worker path: performs the actual provider dispatch through the Channel
   * Module. Throws on failure so the queue layer retries and ultimately routes
   * to the dead-letter queue.
   */
  async dispatch(tenantId: string, messageId: string): Promise<Message> {
    const message = await this.getOrThrow(tenantId, messageId);
    const channelId = message.channelId;
    if (!channelId) {
      throw new BadRequestException(
        `Message ${messageId} has no channel to dispatch on`,
      );
    }
    const recipientId = message.customerId;
    if (!recipientId) {
      throw new BadRequestException(
        `Message ${messageId} has no recipient to dispatch to`,
      );
    }

    const delivery = new MessageDeliveryStatus(randomUUID(), {
      tenantId,
      messageId,
      provider: message.metadata?.provider,
      status: MessageStatusEnum.PROCESSING,
      attemptCount: 0,
    });

    try {
      await this.channelMessageService.sendOutgoingMessage(
        tenantId,
        channelId,
        recipientId,
        message.content ?? '',
      );

      delivery.recordAttempt(MessageStatusEnum.SENT);
      message.recordDeliveryStatus(delivery);
      message.markSent();
      await this.messageRepo.saveDeliveryStatus(delivery, tenantId);
      await this.persist(message, tenantId);
      return message;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      delivery.recordAttempt(MessageStatusEnum.FAILED, undefined, reason);
      message.recordDeliveryStatus(delivery);
      message.markFailed(reason);
      await this.messageRepo.saveDeliveryStatus(delivery, tenantId);
      await this.persist(message, tenantId);
      throw err;
    }
  }

  async retry(
    tenantId: string,
    messageId: string,
    userId?: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, messageId);
    if (!message.status.canRetry()) {
      throw new BadRequestException(
        `Message ${messageId} is not in a retryable state`,
      );
    }
    const statuses = await this.messageRepo.findDeliveryStatuses(
      tenantId,
      messageId,
    );
    message.markRetrying(statuses.length + 1);
    await this.persist(message, tenantId);

    await this.queueService.addJob(QUEUES.MESSAGE, 'message-send-job', {
      messageId,
      channelId: message.channelId,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_RETRY',
      details: `Retrying delivery of message ${messageId}`,
    });
    return message;
  }

  /**
   * Applies an external delivery receipt (provider webhook → channel module →
   * message-delivery-job) onto the message and its delivery ledger.
   */
  async applyDeliveryReceipt(
    tenantId: string,
    messageId: string,
    status: string,
    providerMessageId?: string,
    failureReason?: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, messageId);

    const delivery = new MessageDeliveryStatus(randomUUID(), {
      tenantId,
      messageId,
      providerMessageId,
      status,
      attemptCount: 0,
    });
    delivery.recordAttempt(status, providerMessageId, failureReason);
    await this.messageRepo.saveDeliveryStatus(delivery, tenantId);

    switch (status) {
      case MessageStatusEnum.DELIVERED:
        message.markDelivered(message.metadata?.provider);
        break;
      case MessageStatusEnum.READ:
        message.markRead();
        break;
      case MessageStatusEnum.FAILED:
        message.markFailed(failureReason || 'Provider reported failure');
        break;
      case MessageStatusEnum.SENT:
        message.markSent(providerMessageId);
        break;
      default:
        break;
    }

    message.recordDeliveryStatus(delivery);
    await this.persist(message, tenantId);
    await this.readModel.refresh(tenantId, message.conversationId);
    return message;
  }

  async listDeliveryStatuses(tenantId: string, messageId: string) {
    return this.messageRepo.findDeliveryStatuses(tenantId, messageId);
  }
}
