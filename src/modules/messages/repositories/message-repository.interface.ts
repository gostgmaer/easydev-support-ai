import { ITenantRepository } from '@easydev/shared-kernel';
import { Message } from '../domain/message.aggregate';
import { MessageAttachment } from '../domain/message-attachment.entity';
import { MessageReaction } from '../domain/message-reaction.entity';
import { MessageMention } from '../domain/message-mention.entity';
import { MessageDeliveryStatus } from '../domain/message-delivery-status.entity';
import { MessageTemplate } from '../domain/message-template.entity';
import { MessageDraft } from '../domain/message-draft.entity';

export interface MessageQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortOrder?: 'ASC' | 'DESC';
  conversationId?: string;
  channelId?: string;
  customerId?: string;
  direction?: string;
  status?: string;
  messageType?: string;
  threadId?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface IMessageRepository
  extends ITenantRepository<Message, string> {
  findPaginated(
    tenantId: string,
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<Message>>;
  findByConversation(
    tenantId: string,
    conversationId: string,
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<Message>>;
  findThread(tenantId: string, threadId: string): Promise<Message[]>;
  findByExternalId(
    tenantId: string,
    channelId: string | undefined,
    externalMessageId: string,
  ): Promise<Message | null>;
  search(tenantId: string, query: string, limit?: number): Promise<Message[]>;

  // Reactions
  addReaction(reaction: MessageReaction, tenantId: string): Promise<void>;
  removeReaction(
    tenantId: string,
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<void>;
  findReactions(tenantId: string, messageId: string): Promise<MessageReaction[]>;

  // Mentions
  addMention(mention: MessageMention, tenantId: string): Promise<void>;
  findMentions(tenantId: string, messageId: string): Promise<MessageMention[]>;

  // Attachments
  findAttachments(
    tenantId: string,
    messageId: string,
  ): Promise<MessageAttachment[]>;
  saveAttachment(
    attachment: MessageAttachment,
    tenantId: string,
  ): Promise<void>;
  deleteAttachment(tenantId: string, attachmentId: string): Promise<boolean>;
  getAttachment(
    tenantId: string,
    attachmentId: string,
  ): Promise<MessageAttachment | null>;

  // Delivery status
  saveDeliveryStatus(
    status: MessageDeliveryStatus,
    tenantId: string,
  ): Promise<void>;
  findDeliveryStatuses(
    tenantId: string,
    messageId: string,
  ): Promise<MessageDeliveryStatus[]>;

  // Bulk
  bulkUpdateStatus(
    tenantId: string,
    messageIds: string[],
    status: string,
  ): Promise<number>;

  // Counts (read-model support, never used for inbox listing)
  countByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<{ total: number; attachments: number; unread: number }>;
}

export interface IMessageTemplateRepository
  extends ITenantRepository<MessageTemplate, string> {
  findPaginated(
    tenantId: string,
    page: number,
    limit: number,
    category?: string,
  ): Promise<PaginatedResult<MessageTemplate>>;
  findByName(tenantId: string, name: string): Promise<MessageTemplate | null>;
}

export interface IMessageDraftRepository
  extends ITenantRepository<MessageDraft, string> {
  findByConversationAndAuthor(
    tenantId: string,
    conversationId: string,
    authorId: string,
  ): Promise<MessageDraft | null>;
  findByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<MessageDraft[]>;
  deleteExpired(tenantId: string | undefined, now: Date): Promise<number>;
}
