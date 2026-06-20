import { AggregateRoot } from '@easydev/shared-kernel';
import {
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
} from './value-objects';
import { MessageAttachment } from './message-attachment.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageMention } from './message-mention.entity';
import { MessageDeliveryStatus } from './message-delivery-status.entity';
import {
  MessageCreatedEvent,
  MessageReceivedEvent,
  MessageSentEvent,
  MessageDeliveredEvent,
  MessageReadEvent,
  MessageFailedEvent,
  MessageRetriedEvent,
  MessageArchivedEvent,
} from '@easydev/shared-events';

export interface MessageProps {
  tenantId: string;
  conversationId: string;
  channelId?: string;
  customerId?: string;
  senderId?: string;
  senderType: string; // CUSTOMER, AGENT, BOT, SYSTEM, AI
  messageType: MessageType;
  direction: MessageDirection;
  content?: string;
  contentHtml?: string;
  status: MessageStatus;
  externalMessageId?: string;
  replyToMessageId?: string;
  threadId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  mentions?: MessageMention[];
  deliveryStatuses?: MessageDeliveryStatus[];
}

export class Message extends AggregateRoot<string> {
  private props: MessageProps;

  constructor(id: string, props: MessageProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
      metadata: props.metadata || {},
      attachments: props.attachments || [],
      reactions: props.reactions || [],
      mentions: props.mentions || [],
      deliveryStatuses: props.deliveryStatuses || [],
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get conversationId(): string {
    return this.props.conversationId;
  }
  get channelId(): string | undefined {
    return this.props.channelId;
  }
  get customerId(): string | undefined {
    return this.props.customerId;
  }
  get senderId(): string | undefined {
    return this.props.senderId;
  }
  get senderType(): string {
    return this.props.senderType;
  }
  get messageType(): MessageType {
    return this.props.messageType;
  }
  get direction(): MessageDirection {
    return this.props.direction;
  }
  get content(): string | undefined {
    return this.props.content;
  }
  get contentHtml(): string | undefined {
    return this.props.contentHtml;
  }
  get status(): MessageStatus {
    return this.props.status;
  }
  get externalMessageId(): string | undefined {
    return this.props.externalMessageId;
  }
  get replyToMessageId(): string | undefined {
    return this.props.replyToMessageId;
  }
  get threadId(): string | undefined {
    return this.props.threadId;
  }
  get sentAt(): Date | undefined {
    return this.props.sentAt;
  }
  get deliveredAt(): Date | undefined {
    return this.props.deliveredAt;
  }
  get readAt(): Date | undefined {
    return this.props.readAt;
  }
  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get version(): number {
    return this.props.version!;
  }
  get attachments(): MessageAttachment[] {
    return this.props.attachments!;
  }
  get reactions(): MessageReaction[] {
    return this.props.reactions!;
  }
  get mentions(): MessageMention[] {
    return this.props.mentions!;
  }
  get deliveryStatuses(): MessageDeliveryStatus[] {
    return this.props.deliveryStatuses!;
  }

  public static create(
    id: string,
    props: Omit<MessageProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): Message {
    const message = new Message(id, props);
    message.addDomainEvent(
      new MessageCreatedEvent(
        message.tenantId,
        message.id,
        message.conversationId,
        message.direction.value,
        message.messageType.value,
      ),
    );
    if (message.direction.isInbound()) {
      message.addDomainEvent(
        new MessageReceivedEvent(
          message.tenantId,
          message.id,
          message.conversationId,
          message.content || '',
          message.senderType,
        ),
      );
    }
    return message;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version = this.props.version! + 1;
  }

  public markProcessing(): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.PROCESSING);
    this.touch();
  }

  public markSent(externalMessageId?: string): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.SENT);
    this.props.sentAt = new Date();
    if (externalMessageId) this.props.externalMessageId = externalMessageId;
    this.touch();
    this.addDomainEvent(
      new MessageSentEvent(
        this.tenantId,
        this.id,
        this.conversationId,
        this.content || '',
        this.props.customerId || '',
      ),
    );
  }

  public markDelivered(provider?: string): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.DELIVERED);
    this.props.deliveredAt = new Date();
    this.touch();
    this.addDomainEvent(
      new MessageDeliveredEvent(
        this.tenantId,
        this.id,
        this.conversationId,
        provider,
      ),
    );
  }

  public markRead(readBy?: string): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.READ);
    this.props.readAt = new Date();
    this.touch();
    this.addDomainEvent(
      new MessageReadEvent(this.tenantId, this.id, this.conversationId, readBy),
    );
  }

  public markFailed(reason: string): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.FAILED);
    this.touch();
    this.addDomainEvent(
      new MessageFailedEvent(
        this.tenantId,
        this.id,
        this.channelId || '',
        reason,
      ),
    );
  }

  public markRetrying(attempt: number): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.RETRYING);
    this.touch();
    this.addDomainEvent(
      new MessageRetriedEvent(
        this.tenantId,
        this.id,
        this.conversationId,
        attempt,
      ),
    );
  }

  public archive(): void {
    this.props.status = MessageStatus.create(MessageStatusEnum.ARCHIVED);
    this.touch();
    this.addDomainEvent(
      new MessageArchivedEvent(this.tenantId, this.id, this.conversationId),
    );
  }

  public editContent(content: string, contentHtml?: string): void {
    this.props.content = content;
    if (contentHtml !== undefined) this.props.contentHtml = contentHtml;
    this.touch();
  }

  public assignThread(threadId: string): void {
    this.props.threadId = threadId;
    this.touch();
  }

  public addAttachment(attachment: MessageAttachment): void {
    this.props.attachments!.push(attachment);
    this.touch();
  }

  public addReaction(reaction: MessageReaction): void {
    if (
      this.props.reactions!.some(
        (r) => r.userId === reaction.userId && r.reaction === reaction.reaction,
      )
    ) {
      return;
    }
    this.props.reactions!.push(reaction);
    this.touch();
  }

  public removeReaction(userId: string, reaction: string): void {
    this.props.reactions = this.props.reactions!.filter(
      (r) => !(r.userId === userId && r.reaction === reaction),
    );
    this.touch();
  }

  public addMention(mention: MessageMention): void {
    if (
      this.props.mentions!.some(
        (m) => m.mentionedUserId === mention.mentionedUserId,
      )
    ) {
      return;
    }
    this.props.mentions!.push(mention);
    this.touch();
  }

  public recordDeliveryStatus(status: MessageDeliveryStatus): void {
    this.props.deliveryStatuses!.push(status);
    this.touch();
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      channelId: this.channelId,
      customerId: this.customerId,
      senderId: this.senderId,
      senderType: this.senderType,
      messageType: this.messageType.value,
      direction: this.direction.value,
      content: this.content,
      contentHtml: this.contentHtml,
      status: this.status.value,
      externalMessageId: this.externalMessageId,
      replyToMessageId: this.replyToMessageId,
      threadId: this.threadId,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      readAt: this.readAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      attachments: this.attachments.map((a) => a.toJSON()),
      reactions: this.reactions.map((r) => r.toJSON()),
      mentions: this.mentions.map((m) => m.toJSON()),
      deliveryStatuses: this.deliveryStatuses.map((d) => d.toJSON()),
    };
  }
}
