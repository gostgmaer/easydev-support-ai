import { Message } from '../domain/message.aggregate';
import { MessageAttachment } from '../domain/message-attachment.entity';
import { MessageReaction } from '../domain/message-reaction.entity';
import { MessageMention } from '../domain/message-mention.entity';
import { MessageDeliveryStatus } from '../domain/message-delivery-status.entity';
import { MessageTemplate } from '../domain/message-template.entity';
import { MessageDraft } from '../domain/message-draft.entity';
import {
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
} from '../domain/value-objects';

export class MessageMapper {
  public static attachmentToDomain(raw: any): MessageAttachment {
    return new MessageAttachment(raw.id, {
      tenantId: raw.tenantId,
      messageId: raw.messageId,
      fileName: raw.fileName,
      fileType: raw.fileType || undefined,
      fileSize: raw.fileSize ?? undefined,
      storageProvider: raw.storageProvider || undefined,
      storagePath: raw.storagePath || undefined,
      publicUrl: raw.publicUrl || undefined,
      checksum: raw.checksum || undefined,
      thumbnailUrl: raw.thumbnailUrl || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static reactionToDomain(raw: any): MessageReaction {
    return new MessageReaction(raw.id, {
      tenantId: raw.tenantId,
      messageId: raw.messageId,
      userId: raw.userId,
      reaction: raw.reaction,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static mentionToDomain(raw: any): MessageMention {
    return new MessageMention(raw.id, {
      tenantId: raw.tenantId,
      messageId: raw.messageId,
      mentionedUserId: raw.mentionedUserId,
      mentionedBy: raw.mentionedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static deliveryStatusToDomain(raw: any): MessageDeliveryStatus {
    return new MessageDeliveryStatus(raw.id, {
      tenantId: raw.tenantId,
      messageId: raw.messageId,
      provider: raw.provider || undefined,
      providerMessageId: raw.providerMessageId || undefined,
      status: raw.status,
      attemptCount: raw.attemptCount ?? 0,
      lastAttemptAt: raw.lastAttemptAt || undefined,
      failureReason: raw.failureReason || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static templateToDomain(raw: any): MessageTemplate {
    return new MessageTemplate(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      channelType: raw.channelType || undefined,
      category: raw.category || undefined,
      content: raw.content,
      contentHtml: raw.contentHtml || undefined,
      variables: (raw.variables as Record<string, any>) || {},
      language: raw.language || 'en',
      isActive: raw.isActive ?? true,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static draftToDomain(raw: any): MessageDraft {
    return new MessageDraft(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      authorId: raw.authorId,
      draftContent: raw.draftContent,
      draftType: raw.draftType || 'TEXT',
      expiresAt: raw.expiresAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toDomain(
    raw: any,
    rawAttachments: any[] = [],
    rawReactions: any[] = [],
    rawMentions: any[] = [],
    rawDeliveryStatuses: any[] = [],
  ): Message {
    return new Message(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      channelId: raw.channelId || undefined,
      customerId: raw.customerId || undefined,
      senderId: raw.senderId || undefined,
      senderType: raw.senderType,
      messageType: MessageType.create(raw.messageType as MessageTypeEnum),
      direction: MessageDirection.create(raw.direction as MessageDirectionEnum),
      content: raw.content ?? undefined,
      contentHtml: raw.contentHtml ?? undefined,
      status: MessageStatus.create(raw.status as MessageStatusEnum),
      externalMessageId: raw.externalMessageId || undefined,
      replyToMessageId: raw.replyToMessageId || undefined,
      threadId: raw.threadId || undefined,
      sentAt: raw.sentAt || undefined,
      deliveredAt: raw.deliveredAt || undefined,
      readAt: raw.readAt || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: raw.version || 1,
      attachments: rawAttachments.map((a) =>
        MessageMapper.attachmentToDomain(a),
      ),
      reactions: rawReactions.map((r) => MessageMapper.reactionToDomain(r)),
      mentions: rawMentions.map((m) => MessageMapper.mentionToDomain(m)),
      deliveryStatuses: rawDeliveryStatuses.map((d) =>
        MessageMapper.deliveryStatusToDomain(d),
      ),
    });
  }
}
