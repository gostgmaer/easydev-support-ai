import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import {
  eq,
  and,
  or,
  ilike,
  sql,
  desc,
  asc,
  lt,
  gt,
  isNull,
  inArray,
} from 'drizzle-orm';
import { Message } from '../domain/message.aggregate';
import { MessageAttachment } from '../domain/message-attachment.entity';
import { MessageReaction } from '../domain/message-reaction.entity';
import { MessageMention } from '../domain/message-mention.entity';
import { MessageDeliveryStatus } from '../domain/message-delivery-status.entity';
import {
  IMessageRepository,
  MessageQueryOptions,
  PaginatedResult,
} from './message-repository.interface';
import { MessageMapper } from './message.mapper';

@Injectable()
export class DrizzleMessageRepository implements IMessageRepository {
  private async loadChildren(messageId: string, tenantId: string) {
    const [attachments, reactions, mentions, deliveryStatuses] =
      await Promise.all([
        db
          .select()
          .from(schema.messageAttachments)
          .where(
            and(
              eq(schema.messageAttachments.messageId, messageId),
              eq(schema.messageAttachments.tenantId, tenantId),
            ),
          ),
        db
          .select()
          .from(schema.messageReactions)
          .where(
            and(
              eq(schema.messageReactions.messageId, messageId),
              eq(schema.messageReactions.tenantId, tenantId),
            ),
          ),
        db
          .select()
          .from(schema.messageMentions)
          .where(
            and(
              eq(schema.messageMentions.messageId, messageId),
              eq(schema.messageMentions.tenantId, tenantId),
            ),
          ),
        db
          .select()
          .from(schema.messageDeliveryStatus)
          .where(
            and(
              eq(schema.messageDeliveryStatus.messageId, messageId),
              eq(schema.messageDeliveryStatus.tenantId, tenantId),
            ),
          ),
      ]);
    return { attachments, reactions, mentions, deliveryStatuses };
  }

  async findById(id: string, tenantId: string): Promise<Message | null> {
    const [row] = await db
      .select()
      .from(schema.messages)
      .where(
        and(eq(schema.messages.id, id), eq(schema.messages.tenantId, tenantId)),
      );
    if (!row) return null;
    const children = await this.loadChildren(id, tenantId);
    return MessageMapper.toDomain(
      row,
      children.attachments,
      children.reactions,
      children.mentions,
      children.deliveryStatuses,
    );
  }

  async findAll(tenantId: string): Promise<Message[]> {
    const rows = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.tenantId, tenantId),
          isNull(schema.messages.deletedAt),
        ),
      );
    return rows.map((r) => MessageMapper.toDomain(r));
  }

  async save(message: Message, tenantId: string): Promise<Message> {
    const raw = {
      id: message.id,
      tenantId: message.tenantId,
      conversationId: message.conversationId,
      channelId: message.channelId || null,
      customerId: message.customerId || null,
      senderId: message.senderId || null,
      senderType: message.senderType,
      messageType: message.messageType.value,
      direction: message.direction.value,
      content: message.content ?? null,
      contentHtml: message.contentHtml ?? null,
      status: message.status.value,
      externalMessageId: message.externalMessageId || null,
      replyToMessageId: message.replyToMessageId || null,
      threadId: message.threadId || null,
      sentAt: message.sentAt || null,
      deliveredAt: message.deliveredAt || null,
      readAt: message.readAt || null,
      metadata: message.metadata || null,
      deletedAt: message.deletedAt || null,
      version: message.version,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.messages)
        .where(
          and(
            eq(schema.messages.id, message.id),
            eq(schema.messages.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.messages)
          .set({ ...raw, updatedAt: new Date() })
          .where(
            and(
              eq(schema.messages.id, message.id),
              eq(schema.messages.tenantId, tenantId),
            ),
          );
      } else {
        await tx.insert(schema.messages).values({
          ...raw,
          createdAt: message.createdAt,
          updatedAt: message.createdAt,
        });
      }

      for (const attachment of message.attachments) {
        await tx
          .insert(schema.messageAttachments)
          .values({
            id: attachment.id,
            tenantId: attachment.tenantId,
            messageId: attachment.messageId,
            fileName: attachment.fileName,
            fileType: attachment.fileType || null,
            fileSize: attachment.fileSize ?? null,
            storageProvider: attachment.storageProvider || null,
            storagePath: attachment.storagePath || null,
            publicUrl: attachment.publicUrl || null,
            checksum: attachment.checksum || null,
            thumbnailUrl: attachment.thumbnailUrl || null,
            metadata: attachment.metadata || null,
            createdAt: attachment.createdAt,
            updatedAt: attachment.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const reaction of message.reactions) {
        await tx
          .insert(schema.messageReactions)
          .values({
            id: reaction.id,
            tenantId: reaction.tenantId,
            messageId: reaction.messageId,
            userId: reaction.userId,
            reaction: reaction.reaction,
            createdAt: reaction.createdAt,
            updatedAt: reaction.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const mention of message.mentions) {
        await tx
          .insert(schema.messageMentions)
          .values({
            id: mention.id,
            tenantId: mention.tenantId,
            messageId: mention.messageId,
            mentionedUserId: mention.mentionedUserId,
            mentionedBy: mention.mentionedBy,
            createdAt: mention.createdAt,
            updatedAt: mention.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const delivery of message.deliveryStatuses) {
        await tx
          .insert(schema.messageDeliveryStatus)
          .values({
            id: delivery.id,
            tenantId: delivery.tenantId,
            messageId: delivery.messageId,
            provider: delivery.provider || null,
            providerMessageId: delivery.providerMessageId || null,
            status: delivery.status,
            attemptCount: delivery.attemptCount,
            lastAttemptAt: delivery.lastAttemptAt || null,
            failureReason: delivery.failureReason || null,
            createdAt: delivery.createdAt,
            updatedAt: delivery.updatedAt,
          })
          .onConflictDoNothing();
      }
    });

    return message;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.messages)
      .where(
        and(eq(schema.messages.id, id), eq(schema.messages.tenantId, tenantId)),
      );
    if (!existing) return false;

    await db
      .update(schema.messages)
      .set({ deletedAt: new Date(), status: 'ARCHIVED', updatedAt: new Date() })
      .where(
        and(eq(schema.messages.id, id), eq(schema.messages.tenantId, tenantId)),
      );
    return true;
  }

  private buildConditions(
    tenantId: string,
    options: MessageQueryOptions,
  ): any[] {
    const conditions: any[] = [
      eq(schema.messages.tenantId, tenantId),
      isNull(schema.messages.deletedAt),
    ];
    if (options.conversationId)
      conditions.push(
        eq(schema.messages.conversationId, options.conversationId),
      );
    if (options.channelId)
      conditions.push(eq(schema.messages.channelId, options.channelId));
    if (options.customerId)
      conditions.push(eq(schema.messages.customerId, options.customerId));
    if (options.direction)
      conditions.push(eq(schema.messages.direction, options.direction));
    if (options.status)
      conditions.push(eq(schema.messages.status, options.status));
    if (options.messageType)
      conditions.push(eq(schema.messages.messageType, options.messageType));
    if (options.threadId)
      conditions.push(eq(schema.messages.threadId, options.threadId));
    if (options.search)
      conditions.push(ilike(schema.messages.content, `%${options.search}%`));
    return conditions;
  }

  async findPaginated(
    tenantId: string,
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<Message>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(tenantId, options);
    if (options.cursor)
      conditions.push(lt(schema.messages.createdAt, new Date(options.cursor)));

    const whereClause = and(...conditions);
    const order =
      options.sortOrder === 'ASC'
        ? asc(schema.messages.createdAt)
        : desc(schema.messages.createdAt);

    const rows = await db
      .select()
      .from(schema.messages)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(options.cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.messages)
      .where(and(...this.buildConditions(tenantId, options)));

    const data = rows.map((r) => MessageMapper.toDomain(r));
    const last = rows[rows.length - 1];
    const nextCursor =
      data.length === limit && last
        ? new Date(last.createdAt).toISOString()
        : undefined;

    return { data, total: Number(count), nextCursor };
  }

  async findByConversation(
    tenantId: string,
    conversationId: string,
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<Message>> {
    return this.findPaginated(tenantId, { ...options, conversationId });
  }

  async findThread(tenantId: string, threadId: string): Promise<Message[]> {
    const rows = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.tenantId, tenantId),
          eq(schema.messages.threadId, threadId),
          isNull(schema.messages.deletedAt),
        ),
      )
      .orderBy(asc(schema.messages.createdAt));
    return rows.map((r) => MessageMapper.toDomain(r));
  }

  async findByExternalId(
    tenantId: string,
    channelId: string | undefined,
    externalMessageId: string,
  ): Promise<Message | null> {
    const conditions: any[] = [
      eq(schema.messages.tenantId, tenantId),
      eq(schema.messages.externalMessageId, externalMessageId),
    ];
    if (channelId) conditions.push(eq(schema.messages.channelId, channelId));
    const [row] = await db
      .select()
      .from(schema.messages)
      .where(and(...conditions));
    if (!row) return null;
    return MessageMapper.toDomain(row);
  }

  async search(
    tenantId: string,
    query: string,
    limit = 25,
  ): Promise<Message[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.tenantId, tenantId),
          isNull(schema.messages.deletedAt),
          or(
            ilike(schema.messages.content, pattern),
            ilike(schema.messages.contentHtml, pattern),
          ),
        ),
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);
    return rows.map((r) => MessageMapper.toDomain(r));
  }

  async addReaction(
    reaction: MessageReaction,
    tenantId: string,
  ): Promise<void> {
    await db
      .insert(schema.messageReactions)
      .values({
        id: reaction.id,
        tenantId,
        messageId: reaction.messageId,
        userId: reaction.userId,
        reaction: reaction.reaction,
        createdAt: reaction.createdAt,
        updatedAt: reaction.updatedAt,
      })
      .onConflictDoNothing();
  }

  async removeReaction(
    tenantId: string,
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<void> {
    await db
      .delete(schema.messageReactions)
      .where(
        and(
          eq(schema.messageReactions.tenantId, tenantId),
          eq(schema.messageReactions.messageId, messageId),
          eq(schema.messageReactions.userId, userId),
          eq(schema.messageReactions.reaction, reaction),
        ),
      );
  }

  async findReactions(
    tenantId: string,
    messageId: string,
  ): Promise<MessageReaction[]> {
    const rows = await db
      .select()
      .from(schema.messageReactions)
      .where(
        and(
          eq(schema.messageReactions.tenantId, tenantId),
          eq(schema.messageReactions.messageId, messageId),
        ),
      );
    return rows.map((r) => MessageMapper.reactionToDomain(r));
  }

  async addMention(mention: MessageMention, tenantId: string): Promise<void> {
    await db
      .insert(schema.messageMentions)
      .values({
        id: mention.id,
        tenantId,
        messageId: mention.messageId,
        mentionedUserId: mention.mentionedUserId,
        mentionedBy: mention.mentionedBy,
        createdAt: mention.createdAt,
        updatedAt: mention.updatedAt,
      })
      .onConflictDoNothing();
  }

  async findMentions(
    tenantId: string,
    messageId: string,
  ): Promise<MessageMention[]> {
    const rows = await db
      .select()
      .from(schema.messageMentions)
      .where(
        and(
          eq(schema.messageMentions.tenantId, tenantId),
          eq(schema.messageMentions.messageId, messageId),
        ),
      );
    return rows.map((r) => MessageMapper.mentionToDomain(r));
  }

  async findAttachments(
    tenantId: string,
    messageId: string,
  ): Promise<MessageAttachment[]> {
    const rows = await db
      .select()
      .from(schema.messageAttachments)
      .where(
        and(
          eq(schema.messageAttachments.tenantId, tenantId),
          eq(schema.messageAttachments.messageId, messageId),
        ),
      );
    return rows.map((r) => MessageMapper.attachmentToDomain(r));
  }

  async saveAttachment(
    attachment: MessageAttachment,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: attachment.id,
      tenantId,
      messageId: attachment.messageId,
      fileName: attachment.fileName,
      fileType: attachment.fileType || null,
      fileSize: attachment.fileSize ?? null,
      storageProvider: attachment.storageProvider || null,
      storagePath: attachment.storagePath || null,
      publicUrl: attachment.publicUrl || null,
      checksum: attachment.checksum || null,
      thumbnailUrl: attachment.thumbnailUrl || null,
      metadata: attachment.metadata || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.messageAttachments)
      .where(
        and(
          eq(schema.messageAttachments.id, attachment.id),
          eq(schema.messageAttachments.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.messageAttachments)
        .set(raw)
        .where(
          and(
            eq(schema.messageAttachments.id, attachment.id),
            eq(schema.messageAttachments.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.messageAttachments)
        .values({ ...raw, createdAt: attachment.createdAt });
    }
  }

  async deleteAttachment(
    tenantId: string,
    attachmentId: string,
  ): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.messageAttachments)
      .where(
        and(
          eq(schema.messageAttachments.id, attachmentId),
          eq(schema.messageAttachments.tenantId, tenantId),
        ),
      );
    if (!existing) return false;
    await db
      .delete(schema.messageAttachments)
      .where(
        and(
          eq(schema.messageAttachments.id, attachmentId),
          eq(schema.messageAttachments.tenantId, tenantId),
        ),
      );
    return true;
  }

  async getAttachment(
    tenantId: string,
    attachmentId: string,
  ): Promise<MessageAttachment | null> {
    const [row] = await db
      .select()
      .from(schema.messageAttachments)
      .where(
        and(
          eq(schema.messageAttachments.id, attachmentId),
          eq(schema.messageAttachments.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return MessageMapper.attachmentToDomain(row);
  }

  async saveDeliveryStatus(
    status: MessageDeliveryStatus,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: status.id,
      tenantId,
      messageId: status.messageId,
      provider: status.provider || null,
      providerMessageId: status.providerMessageId || null,
      status: status.status,
      attemptCount: status.attemptCount,
      lastAttemptAt: status.lastAttemptAt || null,
      failureReason: status.failureReason || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.messageDeliveryStatus)
      .where(
        and(
          eq(schema.messageDeliveryStatus.id, status.id),
          eq(schema.messageDeliveryStatus.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.messageDeliveryStatus)
        .set(raw)
        .where(
          and(
            eq(schema.messageDeliveryStatus.id, status.id),
            eq(schema.messageDeliveryStatus.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.messageDeliveryStatus)
        .values({ ...raw, createdAt: status.createdAt });
    }
  }

  async findDeliveryStatuses(
    tenantId: string,
    messageId: string,
  ): Promise<MessageDeliveryStatus[]> {
    const rows = await db
      .select()
      .from(schema.messageDeliveryStatus)
      .where(
        and(
          eq(schema.messageDeliveryStatus.tenantId, tenantId),
          eq(schema.messageDeliveryStatus.messageId, messageId),
        ),
      )
      .orderBy(desc(schema.messageDeliveryStatus.lastAttemptAt));
    return rows.map((r) => MessageMapper.deliveryStatusToDomain(r));
  }

  async bulkUpdateStatus(
    tenantId: string,
    messageIds: string[],
    status: string,
  ): Promise<number> {
    if (messageIds.length === 0) return 0;
    const updated = await db
      .update(schema.messages)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.messages.tenantId, tenantId),
          inArray(schema.messages.id, messageIds),
        ),
      )
      .returning({ id: schema.messages.id });
    return updated.length;
  }

  async countByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<{ total: number; attachments: number; unread: number }> {
    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.tenantId, tenantId),
          eq(schema.messages.conversationId, conversationId),
          isNull(schema.messages.deletedAt),
        ),
      );

    const [{ unread }] = await db
      .select({ unread: sql<number>`cast(count(*) as int)` })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.tenantId, tenantId),
          eq(schema.messages.conversationId, conversationId),
          eq(schema.messages.direction, 'INBOUND'),
          isNull(schema.messages.readAt),
          isNull(schema.messages.deletedAt),
        ),
      );

    const [{ attachments }] = await db
      .select({ attachments: sql<number>`cast(count(*) as int)` })
      .from(schema.messageAttachments)
      .innerJoin(
        schema.messages,
        eq(schema.messageAttachments.messageId, schema.messages.id),
      )
      .where(
        and(
          eq(schema.messageAttachments.tenantId, tenantId),
          eq(schema.messages.conversationId, conversationId),
        ),
      );

    return {
      total: Number(total),
      attachments: Number(attachments),
      unread: Number(unread),
    };
  }
}
