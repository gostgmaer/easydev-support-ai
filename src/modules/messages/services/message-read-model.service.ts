import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMessageRepository } from '../repositories/message-repository.interface';
import type { IConversationRepository } from '../../conversations/repositories/conversation-repository.interface';
import { ConversationSummary } from '../../conversations/domain/conversation-summary.entity';
import { Message } from '../domain/message.aggregate';

/**
 * Projects message activity into the conversation_summary read model so the
 * agent inbox can be served without ever scanning the messages table.
 */
@Injectable()
export class MessageReadModelService {
  private readonly logger = new Logger(MessageReadModelService.name);

  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepo: IMessageRepository,
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
  ) {}

  async applyMessage(tenantId: string, message: Message): Promise<void> {
    await this.refresh(tenantId, message.conversationId, message);
  }

  async refresh(
    tenantId: string,
    conversationId: string,
    lastMessage?: Message,
  ): Promise<void> {
    const counts = await this.messageRepo.countByConversation(
      tenantId,
      conversationId,
    );
    const existing = await this.conversationRepo.getSummary(
      conversationId,
      tenantId,
    );

    const summary = new ConversationSummary(existing?.id || randomUUID(), {
      tenantId,
      conversationId,
      customerName: existing?.customerName,
      customerAvatar: existing?.customerAvatar,
      lastMessage: lastMessage
        ? this.preview(lastMessage)
        : existing?.lastMessage,
      lastMessageType: lastMessage
        ? lastMessage.messageType.value
        : existing?.lastMessageType,
      lastMessageAt: lastMessage?.createdAt || existing?.lastMessageAt,
      unreadCount: counts.unread,
      totalMessages: counts.total,
      totalAttachments: counts.attachments,
      sentimentScore: existing?.sentimentScore ?? 0,
      priority: existing?.priority,
      status: existing?.status,
      assignedAgentName: existing?.assignedAgentName,
      assignedTeamName: existing?.assignedTeamName,
      createdAt: existing?.createdAt,
    });

    await this.conversationRepo.upsertSummary(summary, tenantId);
    this.logger.debug(
      `Projected message read model for conversation ${conversationId}`,
    );
  }

  private preview(message: Message): string {
    const content = message.content || `[${message.messageType.value}]`;
    return content.length > 280 ? `${content.slice(0, 277)}...` : content;
  }
}
