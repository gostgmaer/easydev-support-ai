import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import type { IMessageRepository } from '../repositories/message-repository.interface';
import { Message } from '../domain/message.aggregate';
import {
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
} from '../domain/value-objects';
import { InboundMessageDto } from '../dtos';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { ConversationService } from '../../conversations/services/conversation.service';
import { AuditService } from '../../audit/audit.service';

export interface NormalizedInbound {
  channelId: string;
  conversationId?: string;
  customerId?: string;
  externalMessageId?: string;
  messageType: MessageTypeEnum;
  content: string;
  metadata: Record<string, any>;
}

/**
 * Inbound message pipeline. Runs entirely off the HTTP path (invoked from the
 * message-queue worker): normalize → validate → deduplicate → resolve
 * conversation → persist → publish events → dispatch AI trigger.
 *
 * AI is never executed here; only an AI workflow trigger job is enqueued.
 */
@Injectable()
export class MessageInboundService {
  private readonly logger = new Logger(MessageInboundService.name);

  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepo: IMessageRepository,
    private readonly conversationService: ConversationService,
    private readonly queueService: QueueService,
    private readonly eventPublisher: MessageEventPublisher,
    private readonly readModel: MessageReadModelService,
    private readonly auditService: AuditService,
  ) {}

  private normalize(dto: InboundMessageDto): NormalizedInbound {
    return {
      channelId: dto.channelId,
      conversationId: dto.conversationId,
      customerId: dto.customerId,
      externalMessageId: dto.externalMessageId,
      messageType: dto.messageType || MessageTypeEnum.TEXT,
      content: (dto.content ?? '').toString(),
      metadata: dto.metadata || {},
    };
  }

  private validate(normalized: NormalizedInbound): void {
    if (!normalized.channelId) {
      throw new BadRequestException('Inbound message requires a channelId');
    }
    if (!normalized.conversationId && !normalized.customerId) {
      throw new BadRequestException(
        'Inbound message requires a conversationId or customerId to resolve a conversation',
      );
    }
  }

  private async resolveConversationId(
    tenantId: string,
    normalized: NormalizedInbound,
  ): Promise<string> {
    if (normalized.conversationId) {
      const conversation = await this.conversationService.findById(
        tenantId,
        normalized.conversationId,
      );
      return conversation.id;
    }

    const conversation = await this.conversationService.create(tenantId, {
      customerId: normalized.customerId!,
      channelId: normalized.channelId,
      source: 'INBOUND',
    });
    return conversation.id;
  }

  async ingest(
    tenantId: string,
    dto: InboundMessageDto,
  ): Promise<{ deduplicated: boolean; message?: ReturnType<Message['toJSON']> }> {
    const normalized = this.normalize(dto);
    this.validate(normalized);

    // Deduplication: drop messages we have already persisted for this provider.
    if (normalized.externalMessageId) {
      const existing = await this.messageRepo.findByExternalId(
        tenantId,
        normalized.channelId,
        normalized.externalMessageId,
      );
      if (existing) {
        this.logger.debug(
          `Dropping duplicate inbound message ${normalized.externalMessageId}`,
        );
        return { deduplicated: true };
      }
    }

    const conversationId = await this.resolveConversationId(
      tenantId,
      normalized,
    );

    const message = Message.create(randomUUID(), {
      tenantId,
      conversationId,
      channelId: normalized.channelId,
      customerId: normalized.customerId,
      senderType: 'CUSTOMER',
      messageType: MessageType.create(normalized.messageType),
      direction: MessageDirection.create(MessageDirectionEnum.INBOUND),
      content: normalized.content,
      status: MessageStatus.create(MessageStatusEnum.DELIVERED),
      externalMessageId: normalized.externalMessageId,
      metadata: normalized.metadata,
    });

    await this.messageRepo.save(message, tenantId);
    await this.readModel.applyMessage(tenantId, message);
    await this.eventPublisher.publishAll(message.domainEvents);
    message.clearEvents();

    await this.auditService.log({
      tenantId,
      action: 'MESSAGE_RECEIVE',
      details: `Persisted inbound message ${message.id} on channel ${normalized.channelId}`,
    });

    return { deduplicated: false, message: message.toJSON() };
  }

  /**
   * HTTP entry point: never processes the message inline. The webhook handler
   * only enqueues; the worker invokes {@link ingest}.
   */
  async enqueueWebhook(tenantId: string, dto: InboundMessageDto): Promise<void> {
    await this.queueService.addJob(QUEUES.MESSAGE, 'message-inbound-job', {
      tenantId,
      payload: dto,
    });
  }
}
