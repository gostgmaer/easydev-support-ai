import { Injectable, Logger } from '@nestjs/common';
import { InboxProjectionService } from '../services/inbox-projection.service';
import { InboxActivityService } from '../services/inbox-activity.service';

export interface InboxEventEnvelope {
  tenantId: string;
  eventName: string;
  aggregateId: string;
  conversationId?: string;
  actorId?: string;
  timestamp?: string;
  payload?: Record<string, any>;
}

/**
 * Consumes domain events from the rest of the platform and folds them into the
 * inbox projection + activity feed. Invoked by the inbox queue processor for the
 * inbox-projection-job; producers enqueue the envelope onto the inbox queue.
 */
@Injectable()
export class InboxEventConsumer {
  private readonly logger = new Logger(InboxEventConsumer.name);

  constructor(
    private readonly projection: InboxProjectionService,
    private readonly activity: InboxActivityService,
  ) {}

  async handleEvent(envelope: InboxEventEnvelope): Promise<void> {
    const { tenantId, eventName, payload = {} } = envelope;
    const conversationId = envelope.conversationId || payload.conversationId;
    this.logger.log(
      `Consuming ${eventName} for tenant ${tenantId} (conversation ${conversationId ?? 'n/a'})`,
    );

    switch (eventName) {
      case 'conversation.created':
      case 'conversation.updated':
        if (!conversationId) return;
        await this.projection.projectConversation(tenantId, {
          conversationId,
          customerId: payload.customerId,
          channelId: payload.channelId,
          status: payload.status,
          priority: payload.priority,
          assignedAgentId: payload.assignedAgentId,
          assignedTeamId: payload.assignedTeamId,
        });
        await this.activity.record(
          tenantId,
          conversationId,
          eventName === 'conversation.created'
            ? 'CONVERSATION_OPENED'
            : 'STATUS',
          envelope.actorId,
          payload,
        );
        return;

      case 'message.received':
        if (!conversationId) return;
        await this.projection.projectMessage(tenantId, {
          conversationId,
          content: payload.content,
          at: payload.at ? new Date(payload.at) : undefined,
          type: payload.messageType,
          direction: 'INBOUND',
        });
        await this.activity.record(
          tenantId,
          conversationId,
          'MESSAGE',
          envelope.actorId,
          { direction: 'INBOUND' },
        );
        return;

      case 'message.sent':
        if (!conversationId) return;
        await this.projection.projectMessage(tenantId, {
          conversationId,
          content: payload.content,
          at: payload.at ? new Date(payload.at) : undefined,
          type: payload.messageType,
          direction: 'OUTBOUND',
        });
        await this.activity.record(
          tenantId,
          conversationId,
          'MESSAGE',
          envelope.actorId,
          { direction: 'OUTBOUND' },
        );
        return;

      case 'ticket.created':
        if (!conversationId) return;
        await this.projection.adjustOpenTicketCount(
          tenantId,
          conversationId,
          1,
        );
        await this.activity.record(
          tenantId,
          conversationId,
          'TICKET',
          envelope.actorId,
          { ticketId: envelope.aggregateId, status: payload.status },
        );
        return;

      case 'ticket.updated':
        if (!conversationId) return;
        if (payload.status && ['RESOLVED', 'CLOSED'].includes(payload.status)) {
          await this.projection.adjustOpenTicketCount(
            tenantId,
            conversationId,
            -1,
          );
        }
        await this.activity.record(
          tenantId,
          conversationId,
          'TICKET',
          envelope.actorId,
          { ticketId: envelope.aggregateId, status: payload.status },
        );
        return;

      case 'assignment.completed':
        if (!conversationId) return;
        await this.projection.projectConversation(tenantId, {
          conversationId,
          assignedAgentId: payload.assigneeId || payload.assignedAgentId,
          assignedTeamId: payload.assignedTeamId,
        });
        await this.activity.record(
          tenantId,
          conversationId,
          'ASSIGNED',
          envelope.actorId,
          payload,
        );
        return;

      case 'ai.escalation.created':
        if (!conversationId) return;
        await this.projection.projectAiSignals(tenantId, conversationId, {
          sentiment: payload.sentiment,
          aiConfidenceScore: payload.confidence,
          escalated: true,
        });
        await this.activity.record(
          tenantId,
          conversationId,
          'AI_ESCALATION',
          envelope.actorId,
          payload,
        );
        return;

      case 'workflow.execution.completed':
        if (!conversationId) return;
        await this.activity.record(
          tenantId,
          conversationId,
          'WORKFLOW',
          envelope.actorId,
          { executionId: payload.executionId, status: payload.status },
        );
        return;

      default:
        this.logger.debug(`No inbox projection mapping for ${eventName}`);
        return;
    }
  }
}
