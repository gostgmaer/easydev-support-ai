import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  IMessageRepository,
  MessageQueryOptions,
} from '../repositories/message-repository.interface';
import { Message } from '../domain/message.aggregate';
import { MessageReaction } from '../domain/message-reaction.entity';
import { MessageMention } from '../domain/message-mention.entity';
import {
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
} from '../domain/value-objects';
import {
  CreateMessageDto,
  UpdateMessageDto,
  ReplyMessageDto,
  MessageQueryDto,
} from '../dtos';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { ConversationService } from '../../conversations/services/conversation.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class MessageService {
  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepo: IMessageRepository,
    private readonly eventPublisher: MessageEventPublisher,
    private readonly readModel: MessageReadModelService,
    private readonly conversationService: ConversationService,
    private readonly auditService: AuditService,
  ) {}

  private async persist(message: Message, tenantId: string): Promise<void> {
    await this.messageRepo.save(message, tenantId);
    await this.readModel.applyMessage(tenantId, message);
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

  async create(
    tenantId: string,
    dto: CreateMessageDto,
    userId?: string,
  ): Promise<Message> {
    // Integrate with Conversation Module: the conversation must exist.
    const conversation = await this.conversationService.findById(
      tenantId,
      dto.conversationId,
    );

    const direction = dto.direction || MessageDirectionEnum.OUTBOUND;
    const initialStatus =
      direction === MessageDirectionEnum.INBOUND
        ? MessageStatusEnum.DELIVERED
        : MessageStatusEnum.QUEUED;

    const messageId = randomUUID();
    const message = Message.create(messageId, {
      tenantId,
      conversationId: dto.conversationId,
      channelId: dto.channelId || conversation.channelId,
      customerId: dto.customerId || conversation.customerId,
      senderId: dto.senderId,
      senderType: dto.senderType,
      messageType: MessageType.create(dto.messageType || MessageTypeEnum.TEXT),
      direction: MessageDirection.create(direction),
      content: dto.content,
      contentHtml: dto.contentHtml,
      status: MessageStatus.create(initialStatus),
      replyToMessageId: dto.replyToMessageId,
      threadId: dto.threadId || dto.replyToMessageId,
      metadata: dto.metadata || {},
    });

    await this.persist(message, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_CREATE',
      details: `Created ${direction} message ${messageId} in conversation ${dto.conversationId}`,
    });

    return message;
  }

  async reply(
    tenantId: string,
    replyToMessageId: string,
    dto: ReplyMessageDto,
    userId?: string,
  ): Promise<Message> {
    const parent = await this.getOrThrow(tenantId, replyToMessageId);
    const threadId = parent.threadId || parent.id;

    return this.create(
      tenantId,
      {
        conversationId: parent.conversationId,
        channelId: parent.channelId,
        customerId: parent.customerId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        messageType: dto.messageType || MessageTypeEnum.TEXT,
        direction: MessageDirectionEnum.OUTBOUND,
        content: dto.content,
        replyToMessageId,
        threadId,
      },
      userId,
    );
  }

  async getThread(tenantId: string, threadId: string): Promise<Message[]> {
    return this.messageRepo.findThread(tenantId, threadId);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateMessageDto,
    userId?: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, id);
    if (dto.content !== undefined || dto.contentHtml !== undefined) {
      message.editContent(
        dto.content ?? message.content ?? '',
        dto.contentHtml,
      );
    }
    if (dto.status !== undefined) {
      this.applyStatus(message, dto.status);
    }
    await this.persist(message, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_UPDATE',
      details: `Updated message ${id}`,
    });
    return message;
  }

  private applyStatus(message: Message, status: MessageStatusEnum): void {
    switch (status) {
      case MessageStatusEnum.READ:
        message.markRead();
        break;
      case MessageStatusEnum.DELIVERED:
        message.markDelivered();
        break;
      case MessageStatusEnum.ARCHIVED:
        message.archive();
        break;
      case MessageStatusEnum.SENT:
        message.markSent();
        break;
      case MessageStatusEnum.FAILED:
        message.markFailed('Marked failed');
        break;
      default:
        throw new BadRequestException(
          `Status ${status} cannot be set directly`,
        );
    }
  }

  async markRead(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, id);
    message.markRead(userId);
    await this.persist(message, tenantId);
    return message;
  }

  async archive(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, id);
    message.archive();
    await this.persist(message, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_ARCHIVE',
      details: `Archived message ${id}`,
    });
    return message;
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const message = await this.getOrThrow(tenantId, id);
    message.softDelete();
    await this.messageRepo.delete(id, tenantId);
    await this.readModel.refresh(tenantId, message.conversationId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_DELETE',
      details: `Soft deleted message ${id}`,
    });
    return true;
  }

  async react(
    tenantId: string,
    id: string,
    userId: string,
    reaction: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, id);
    message.addReaction(
      new MessageReaction(randomUUID(), {
        tenantId,
        messageId: id,
        userId,
        reaction,
      }),
    );
    await this.persist(message, tenantId);
    return message;
  }

  async removeReaction(
    tenantId: string,
    id: string,
    userId: string,
    reaction: string,
  ): Promise<void> {
    await this.getOrThrow(tenantId, id);
    await this.messageRepo.removeReaction(tenantId, id, userId, reaction);
  }

  async mention(
    tenantId: string,
    id: string,
    mentionedUserId: string,
    mentionedBy: string,
  ): Promise<Message> {
    const message = await this.getOrThrow(tenantId, id);
    message.addMention(
      new MessageMention(randomUUID(), {
        tenantId,
        messageId: id,
        mentionedUserId,
        mentionedBy,
      }),
    );
    await this.persist(message, tenantId);
    return message;
  }

  async findById(tenantId: string, id: string): Promise<Message> {
    return this.getOrThrow(tenantId, id);
  }

  async findPaginated(tenantId: string, query: MessageQueryDto) {
    return this.messageRepo.findPaginated(
      tenantId,
      query as MessageQueryOptions,
    );
  }

  async findByConversation(
    tenantId: string,
    conversationId: string,
    query: MessageQueryDto,
  ) {
    return this.messageRepo.findByConversation(
      tenantId,
      conversationId,
      query as MessageQueryOptions,
    );
  }

  async bulkUpdateStatus(
    tenantId: string,
    messageIds: string[],
    status: MessageStatusEnum,
    userId?: string,
  ): Promise<{ updated: number }> {
    const updated = await this.messageRepo.bulkUpdateStatus(
      tenantId,
      messageIds,
      status,
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_BULK_UPDATE',
      details: `Bulk set status ${status} on ${updated} messages`,
    });
    return { updated };
  }
}
