import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsAggregationService } from '../services/analytics-aggregation.service';
import { AnalyticsRealtimeService } from '../services/analytics-realtime.service';
import {
  ConversationCreatedEvent,
  ConversationClosedEvent,
  MessageSentEvent,
  MessageReceivedEvent,
  TicketCreatedEvent,
  TicketClosedEvent,
  TicketResolvedEvent,
  TicketAssignedEvent,
  SlaBreachedEvent,
  AiWorkflowCompletedEvent,
  ConnectorExecutedEvent,
  WorkflowCompletedEvent,
  CustomerCreatedEvent,
} from '@easydev/shared-events';

@Injectable()
export class AnalyticsEventConsumer {
  private readonly logger = new Logger(AnalyticsEventConsumer.name);

  constructor(
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly realtimeService: AnalyticsRealtimeService,
  ) {}

  async handleEvent(event: {
    tenantId: string;
    eventName: string;
    aggregateType: string;
    aggregateId: string;
    userId?: string;
    timestamp: string;
    payload: any;
    metadata?: any;
  }): Promise<void> {
    this.logger.log(
      `Consuming event ${event.eventName} for Tenant ${event.tenantId}`,
    );

    // Update Projections / Aggregations
    await this.aggregationService.processEvent(event);

    // Stream realtime updates to dashboard
    await this.realtimeService.publishRealtimeEvent(
      event.tenantId,
      event.eventName,
      {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        userId: event.userId,
        timestamp: event.timestamp,
        payload: event.payload,
      },
    );
  }

  // Individual event handlers for modular invocation
  async onConversationCreated(event: ConversationCreatedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'conversation.created',
      aggregateType: 'Conversation',
      aggregateId: event.conversationId,
      timestamp: new Date().toISOString(),
      payload: {
        customerId: event.customerId,
        channelId: event.channelId,
      },
    });
  }

  async onConversationClosed(event: ConversationClosedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'conversation.closed',
      aggregateType: 'Conversation',
      aggregateId: event.conversationId,
      timestamp: new Date().toISOString(),
      payload: {
        reason: event.reason,
      },
    });
  }

  async onMessageSent(event: MessageSentEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'message.sent',
      aggregateType: 'Message',
      aggregateId: event.messageId,
      timestamp: new Date().toISOString(),
      payload: {
        conversationId: event.conversationId,
        recipientId: event.recipientId,
      },
    });
  }

  async onMessageReceived(event: MessageReceivedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'message.received',
      aggregateType: 'Message',
      aggregateId: event.messageId,
      timestamp: new Date().toISOString(),
      payload: {
        conversationId: event.conversationId,
        senderType: event.senderType,
      },
    });
  }

  async onTicketCreated(event: TicketCreatedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'ticket.created',
      aggregateType: 'Ticket',
      aggregateId: event.ticketId,
      timestamp: new Date().toISOString(),
      payload: {
        status: event.status,
        priority: event.priority,
      },
    });
  }

  async onTicketClosed(event: TicketClosedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'ticket.closed',
      aggregateType: 'Ticket',
      aggregateId: event.ticketId,
      timestamp: new Date().toISOString(),
      payload: {
        closedBy: event.closedBy,
      },
    });
  }

  async onTicketResolved(event: TicketResolvedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'ticket.resolved',
      aggregateType: 'Ticket',
      aggregateId: event.ticketId,
      timestamp: new Date().toISOString(),
      payload: {
        resolvedBy: event.resolvedBy,
      },
    });
  }

  async onTicketAssigned(event: TicketAssignedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'ticket.assigned',
      aggregateType: 'Ticket',
      aggregateId: event.ticketId,
      timestamp: new Date().toISOString(),
      payload: {
        agentId: event.agentId,
        teamId: event.teamId,
      },
    });
  }

  async onSlaBreached(event: SlaBreachedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'sla.breached',
      aggregateType: 'TicketSla',
      aggregateId: event.slaId,
      timestamp: new Date().toISOString(),
      payload: {
        ticketId: event.ticketId,
        breachType: event.breachType,
      },
    });
  }

  async onAiWorkflowCompleted(event: AiWorkflowCompletedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'ai.workflow.completed',
      aggregateType: 'AiWorkflow',
      aggregateId: event.workflowId,
      timestamp: new Date().toISOString(),
      payload: {
        workflowExecutionId: event.workflowExecutionId,
        tokensUsed: event.tokensUsed,
        estimatedCost: event.estimatedCost,
      },
    });
  }

  async onConnectorExecuted(event: ConnectorExecutedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'connector.executed',
      aggregateType: 'ConnectorInstance',
      aggregateId: event.connectorId,
      timestamp: new Date().toISOString(),
      payload: {
        capabilityName: event.capabilityName,
        status: event.status,
        latencyMs: event.latencyMs,
      },
    });
  }

  async onWorkflowExecutionCompleted(
    event: WorkflowCompletedEvent,
  ): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'workflow.execution.completed',
      aggregateType: 'WorkflowTemplate',
      aggregateId: event.workflowId,
      timestamp: new Date().toISOString(),
      payload: {
        executionId: event.executionId,
        status: event.status,
      },
    });
  }

  async onCustomerCreated(event: CustomerCreatedEvent): Promise<void> {
    await this.handleEvent({
      tenantId: event.tenantId,
      eventName: 'customer.created',
      aggregateType: 'Customer',
      aggregateId: event.customerId,
      timestamp: new Date().toISOString(),
      payload: {
        email: event.email,
      },
    });
  }
}
