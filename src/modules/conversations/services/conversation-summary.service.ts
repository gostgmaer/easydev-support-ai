import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IConversationRepository } from '../repositories/conversation-repository.interface';
import type { ITeamRepository } from '../../teams/repositories/team-repository.interface';
import { ConversationSummary } from '../domain/conversation-summary.entity';
import { ConversationSentimentEnum } from '../domain/value-objects';
import { CustomerService } from '../../customers/services/customer.service';
import { AgentProfileService } from '../../teams/services/agent-profile.service';

const SENTIMENT_SCORE: Record<string, number> = {
  [ConversationSentimentEnum.POSITIVE]: 1,
  [ConversationSentimentEnum.NEUTRAL]: 0,
  [ConversationSentimentEnum.NEGATIVE]: -1,
};

@Injectable()
export class ConversationSummaryService {
  private readonly logger = new Logger(ConversationSummaryService.name);

  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
    @Inject('ITeamRepository')
    private readonly teamRepo: ITeamRepository,
    private readonly customerService: CustomerService,
    private readonly agentProfileService: AgentProfileService,
  ) {}

  /**
   * Rebuilds the inbox-optimized read model for a single conversation. This is
   * the only writer of conversation_summary; the inbox never queries messages.
   */
  async rebuild(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationSummary | null> {
    const conversation = await this.conversationRepo.findById(
      conversationId,
      tenantId,
    );
    if (!conversation) return null;

    let customerName: string | undefined;
    let customerAvatar: string | undefined;
    try {
      const customer = await this.customerService.findById(
        tenantId,
        conversation.customerId,
      );
      customerName =
        customer.profile?.displayName ||
        (customer.metadata?.syntheticEmail
          ? customer.externalCustomerId
          : customer.email.value);
      customerAvatar = customer.profile?.avatarUrl;
    } catch {
      customerName = undefined;
    }

    let assignedAgentName: string | undefined;
    if (conversation.assignedAgentId) {
      try {
        const agent = await this.agentProfileService.findById(
          tenantId,
          conversation.assignedAgentId,
        );
        assignedAgentName = agent.displayName;
      } catch {
        assignedAgentName = undefined;
      }
    }

    let assignedTeamName: string | undefined;
    if (conversation.assignedTeamId) {
      try {
        const team = await this.teamRepo.findById(
          conversation.assignedTeamId,
          tenantId,
        );
        assignedTeamName = team?.name;
      } catch {
        assignedTeamName = undefined;
      }
    }

    const existing = await this.conversationRepo.getSummary(
      conversationId,
      tenantId,
    );
    const summary = new ConversationSummary(existing?.id || randomUUID(), {
      tenantId,
      conversationId,
      customerName,
      customerAvatar,
      lastMessage: existing?.lastMessage,
      lastMessageType: existing?.lastMessageType,
      lastMessageAt: conversation.lastMessageAt || existing?.lastMessageAt,
      unreadCount: existing?.unreadCount ?? 0,
      totalMessages: existing?.totalMessages ?? 0,
      totalAttachments: existing?.totalAttachments ?? 0,
      sentimentScore: SENTIMENT_SCORE[conversation.sentiment.value] ?? 0,
      priority: conversation.priority.value,
      status: conversation.status.value,
      assignedAgentName,
      assignedTeamName,
      createdAt: existing?.createdAt,
    });

    await this.conversationRepo.upsertSummary(summary, tenantId);
    this.logger.debug(`Rebuilt conversation summary for ${conversationId}`);
    return summary;
  }

  async getSummary(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationSummary | null> {
    return this.conversationRepo.getSummary(conversationId, tenantId);
  }
}
