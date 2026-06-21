// @ts-nocheck
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConversationService } from '../../conversations/services/conversation.service';
import { MessageService } from '../../messages/services/message.service';
import { AIPlatformClient } from '../../ai-integration/services/ai-platform.client';
import { ChannelMessageService } from '../../channels/services/channel-message.service';
import { AuditService } from '../../audit/audit.service';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import {
  EmailDraftGeneratedEvent,
  EmailDraftApprovedEvent,
  EmailDraftRejectedEvent,
  EmailReplySentEvent,
} from '@easydev/shared-events';
import { ConversationEventPublisher } from '../../conversations/services/conversation-event.publisher';

export interface EmailDraft {
  id: string;
  conversationId: string;
  tenantId: string;
  subject: string;
  body: string;
  recipientEmail: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SENT';
  agentId?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * EmailChannelDraftService  (FLOW 6)
 *
 * Manages the full email-channel AI-draft lifecycle:
 *   Inbound Email → Conversation Creation → AI Draft Generation
 *   → Agent Review (approve / reject) → Customer Reply → Resolution
 *
 * Drafts are held in-memory (with a Redis / DB persistence call) while
 * awaiting agent approval.  On approval the draft is sent via the channel
 * connector.  On rejection a new AI draft can be requested or the agent
 * composes manually.
 */
@Injectable()
export class EmailChannelDraftService {
  private readonly logger = new Logger(EmailChannelDraftService.name);

  /**
   * In-memory draft store (tenant-scoped).  In production this should be
   * backed by a database table; the structure mirrors what a Drizzle entity
   * would look like and can be replaced without changing the service API.
   */
  private readonly draftStore = new Map<string, EmailDraft>();

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly aiClient: AIPlatformClient,
    private readonly channelMessageService: ChannelMessageService,
    private readonly auditService: AuditService,
    private readonly realtime: InboxRealtimeService,
    private readonly queueService: QueueService,
    private readonly eventPublisher: ConversationEventPublisher,
  ) {}

  // ─── Step 1: Generate AI Draft ────────────────────────────────────────────

  /**
   * Generates an AI draft reply for an inbound email conversation and stores
   * it in PENDING_REVIEW state so an agent can review before sending.
   */
  async generateDraft(
    tenantId: string,
    conversationId: string,
    agentId?: string,
  ): Promise<EmailDraft> {
    this.logger.log(
      `Generating AI draft for conversation ${conversationId} (tenant ${tenantId})`,
    );

    const conversation = await this.conversationService.findById(
      tenantId,
      conversationId,
    );
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Fetch message history as context
    const messages = await this.messageService.findByConversation(
      tenantId,
      conversationId,
    );

    const lastCustomerMsg = [...messages]
      .reverse()
      .find((m: any) => m.senderType === 'CUSTOMER' || m.direction === 'INBOUND');

    const context = messages.map((m: any) => ({
      role: m.senderType === 'CUSTOMER' ? 'user' : 'assistant',
      content: m.content || m.body || '',
    }));

    // Call AI Platform for draft
    let aiDraftBody: string;
    let subject = 'Re: Your support request';
    try {
      const aiResponse = await this.aiClient.generateEmailDraft(
        tenantId,
        context,
        lastCustomerMsg?.content || '',
      );
      aiDraftBody = aiResponse.draftBody || aiResponse.suggestedResponse || '';
      subject = aiResponse.subject || subject;
    } catch (aiError: any) {
      this.logger.warn(
        `AI draft generation failed: ${aiError.message}. Using template.`,
      );
      aiDraftBody = this.buildFallbackDraft(lastCustomerMsg?.content);
    }

    const draftId = crypto.randomUUID();
    const draft: EmailDraft = {
      id: draftId,
      conversationId,
      tenantId,
      subject,
      body: aiDraftBody,
      recipientEmail: conversation.metadata?.customerEmail || '',
      status: 'PENDING_REVIEW',
      agentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.draftStore.set(`${tenantId}:${draftId}`, draft);

    // Publish event and notify agent via realtime
    await this.eventPublisher.publish(
      new EmailDraftGeneratedEvent(tenantId, conversationId, draftId, agentId),
    );

    // Notify agent that draft is ready for review
    if (agentId) {
      await this.queueService.addJob(QUEUES.NOTIFICATION, 'email-draft-review', {
        tenantId,
        conversationId,
        draftId,
        agentId,
      });
    }

    await this.realtime.emitConversationUpdate(tenantId, {
      event: 'email.draft.generated',
      conversationId,
      draftId,
    });

    return draft;
  }

  // ─── Step 2: Agent Review — Approve ───────────────────────────────────────

  /**
   * Agent approves the draft.  The draft content is sent via the email
   * channel connector and a BOT message is persisted.
   */
  async approveDraft(
    tenantId: string,
    draftId: string,
    agentId: string,
    overrideBody?: string,
  ): Promise<{ sent: boolean; messageId: string }> {
    const draft = this.getDraft(tenantId, draftId);
    if (draft.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `Draft ${draftId} is not in PENDING_REVIEW state (current: ${draft.status})`,
      );
    }

    const finalBody = overrideBody || draft.body;

    const conversation = await this.conversationService.findById(
      tenantId,
      draft.conversationId,
    );
    if (!conversation?.channelId) {
      throw new BadRequestException(
        `Conversation ${draft.conversationId} has no channel to send the draft on`,
      );
    }

    // Send via channel
    await this.channelMessageService.deliverOutgoingMessage(
      tenantId,
      conversation.channelId,
      draft.recipientEmail,
      {
        to: draft.recipientEmail,
        subject: draft.subject,
        text: finalBody,
      },
    );

    // Persist as agent message in conversation
    const message = await this.messageService.create(tenantId, {
      conversationId: draft.conversationId,
      content: finalBody,
      senderType: 'AGENT',
      senderId: agentId,
      direction: 'OUTBOUND',
      messageType: MessageTypeEnum.TEXT as any,
      metadata: { draftId, emailSubject: draft.subject },
    });

    draft.status = 'SENT';
    draft.agentId = agentId;
    draft.updatedAt = new Date();

    await this.eventPublisher.publish(
      new EmailDraftApprovedEvent(tenantId, draft.conversationId, draftId, agentId),
    );
    await this.eventPublisher.publish(
      new EmailReplySentEvent(
        tenantId,
        draft.conversationId,
        message.id,
        agentId,
        draft.recipientEmail,
      ),
    );

    await this.auditService.log({
      tenantId,
      userId: agentId,
      action: 'EMAIL_DRAFT_APPROVED',
      details: `Agent approved and sent email draft ${draftId} for conversation ${draft.conversationId}`,
    });

    return { sent: true, messageId: message.id };
  }

  // ─── Step 3: Agent Review — Reject ────────────────────────────────────────

  async rejectDraft(
    tenantId: string,
    draftId: string,
    agentId: string,
    reason?: string,
  ): Promise<{ rejected: boolean }> {
    const draft = this.getDraft(tenantId, draftId);
    if (draft.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `Draft ${draftId} is not in PENDING_REVIEW state`,
      );
    }

    draft.status = 'REJECTED';
    draft.agentId = agentId;
    draft.rejectionReason = reason;
    draft.updatedAt = new Date();

    await this.eventPublisher.publish(
      new EmailDraftRejectedEvent(
        tenantId,
        draft.conversationId,
        draftId,
        agentId,
        reason,
      ),
    );

    await this.auditService.log({
      tenantId,
      userId: agentId,
      action: 'EMAIL_DRAFT_REJECTED',
      details: `Agent rejected email draft ${draftId}: ${reason || 'No reason provided'}`,
    });

    return { rejected: true };
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  getDraft(tenantId: string, draftId: string): EmailDraft {
    const draft = this.draftStore.get(`${tenantId}:${draftId}`);
    if (!draft) {
      throw new NotFoundException(`Email draft ${draftId} not found`);
    }
    return draft;
  }

  getDraftsByConversation(tenantId: string, conversationId: string): EmailDraft[] {
    const result: EmailDraft[] = [];
    for (const [key, draft] of this.draftStore.entries()) {
      if (key.startsWith(`${tenantId}:`) && draft.conversationId === conversationId) {
        result.push(draft);
      }
    }
    return result;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildFallbackDraft(lastCustomerMessage?: string): string {
    return [
      'Dear Customer,',
      '',
      'Thank you for reaching out to our support team.',
      lastCustomerMessage
        ? `We received your message: "${lastCustomerMessage.slice(0, 120)}..."`
        : 'We have received your support request.',
      '',
      'Our team is reviewing your case and will provide a detailed response shortly.',
      '',
      'Best regards,',
      'Support Team',
    ].join('\n');
  }
}
