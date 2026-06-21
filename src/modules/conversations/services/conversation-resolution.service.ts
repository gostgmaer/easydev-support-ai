// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { MessageService } from '../../messages/services/message.service';
import { TicketService } from '../../tickets/services/ticket.service';
import { NotificationService } from '../../notifications/notification.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import {
  ConversationResolutionStartedEvent,
  CustomerNotifiedOnResolutionEvent,
} from '@easydev/shared-events';
import { ConversationEventPublisher } from './conversation-event.publisher';

/**
 * ConversationResolutionService  (FLOW 1 – Agent Resolution → Conversation Closed)
 *
 * Orchestrates the terminal steps of a conversation lifecycle:
 *   1. Agent marks conversation as resolved.
 *   2. Linked ticket (if any) is also resolved.
 *   3. Customer receives a resolution notification.
 *   4. CSAT survey is queued.
 *   5. Conversation is formally closed and realtime update is broadcast.
 *   6. Analytics event is emitted.
 */
@Injectable()
export class ConversationResolutionService {
  private readonly logger = new Logger(ConversationResolutionService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly ticketService: TicketService,
    private readonly notificationService: NotificationService,
    private readonly customerService: CustomerService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly realtime: InboxRealtimeService,
    private readonly eventPublisher: ConversationEventPublisher,
  ) {}

  /**
   * Resolve and close a conversation, trigger all downstream notifications.
   *
   * @param tenantId    Tenant scoping.
   * @param conversationId  Conversation to resolve.
   * @param agentId     Agent performing the resolution.
   * @param options     Optional summary, linked ticketId, closing message.
   */
  async resolve(
    tenantId: string,
    conversationId: string,
    agentId: string,
    options: {
      summary?: string;
      linkedTicketId?: string;
      closingMessage?: string;
    } = {},
  ): Promise<{ conversationId: string; status: string }> {
    this.logger.log(
      `Resolving conversation ${conversationId} by agent ${agentId} (tenant ${tenantId})`,
    );

    // ─── 1. Publish resolution-started event ─────────────────────────────
    await this.eventPublisher.publish(
      new ConversationResolutionStartedEvent(tenantId, conversationId, agentId),
    );

    // ─── 2. Load conversation ─────────────────────────────────────────────
    const conversation = await this.conversationService.findById(
      tenantId,
      conversationId,
    );
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // ─── 3. Send closing message to customer (if provided) ───────────────
    if (options.closingMessage) {
      await this.messageService.create(tenantId, {
        conversationId,
        content: options.closingMessage,
        senderType: 'AGENT',
        senderId: agentId,
        direction: MessageDirectionEnum.OUTBOUND as any,
        messageType: MessageTypeEnum.TEXT as any,
      });
    }

    // ─── 4. Resolve the conversation aggregate ────────────────────────────
    const resolved = await this.conversationService.resolve(
      tenantId,
      conversationId,
      agentId,
    );

    // ─── 5. Also resolve any linked ticket ───────────────────────────────
    if (options.linkedTicketId) {
      try {
        await this.ticketService.resolve(
          tenantId,
          options.linkedTicketId,
          agentId,
          { summary: options.summary } as any,
        );
        this.logger.log(
          `Linked ticket ${options.linkedTicketId} resolved alongside conversation.`,
        );
      } catch (err: any) {
        this.logger.warn(`Failed to resolve linked ticket: ${err.message}`);
      }
    }

    // ─── 6. Load customer email for notification ──────────────────────────
    let customerEmail: string | undefined;
    try {
      const customer = await this.customerService.findById(
        tenantId,
        conversation.customerId,
      );
      customerEmail = customer?.email || "";
    } catch (err: any) {
      this.logger.warn(`Could not load customer for notification: ${err.message}`);
    }

    // ─── 7. Notify customer of resolution via notification queue ─────────
    await this.queueService.addJob(QUEUES.NOTIFICATION, 'conversation-resolved', {
      tenantId,
      conversationId,
      customerEmail,
      summary: options.summary,
    });

    if (customerEmail) {
      await this.eventPublisher.publish(
        new CustomerNotifiedOnResolutionEvent(
          tenantId,
          conversationId,
          conversation.customerId,
          'EMAIL',
        ),
      );
    }

    // ─── 8. Queue CSAT survey ──────────────────────────────────────────────
    await this.queueService.addJob(QUEUES.NOTIFICATION, 'customer-survey', {
      tenantId,
      conversationId,
      customerEmail,
      surveyUrl: `${process.env.WIDGET_SURVEY_BASE_URL || 'https://app.easydev.ai/survey'}/${conversationId}`,
    });

    // ─── 9. Close the conversation ────────────────────────────────────────
    const closed = await this.conversationService.close(
      tenantId,
      conversationId,
      'Agent resolved',
    );

    // ─── 10. Emit analytics ──────────────────────────────────────────────
    await this.queueService.addJob(QUEUES.ANALYTICS, 'conversation-resolved', {
      tenantId,
      conversationId,
      agentId,
      summary: options.summary,
    });

    // ─── 11. Audit ───────────────────────────────────────────────────────
    await this.auditService.log({
      tenantId,
      userId: agentId,
      action: 'CONVERSATION_RESOLVED',
      details: `Agent ${agentId} resolved conversation ${conversationId}`,
    });

    this.logger.log(
      `Conversation ${conversationId} fully resolved and closed (tenant ${tenantId})`,
    );

    return { conversationId: closed.id, status: closed.status.value };
  }
}
