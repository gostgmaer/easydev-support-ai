import { DomainEvent } from '@easydev/shared-kernel';

export class ConversationCreatedEvent extends DomainEvent {
  static readonly eventName = 'conversation.created';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly customerId: string,
    public readonly channelId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationAssignedEvent extends DomainEvent {
  static readonly eventName = 'conversation.assigned';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationClosedEvent extends DomainEvent {
  static readonly eventName = 'conversation.closed';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly reason?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationUpdatedEvent extends DomainEvent {
  static readonly eventName = 'conversation.updated';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly status: string,
    public readonly priority: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationTransferredEvent extends DomainEvent {
  static readonly eventName = 'conversation.transferred';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly fromAgentId: string | undefined,
    public readonly toAgentId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationTaggedEvent extends DomainEvent {
  static readonly eventName = 'conversation.tagged';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly tag: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationNoteAddedEvent extends DomainEvent {
  static readonly eventName = 'conversation.note_added';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly noteId: string,
    public readonly authorId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationResolvedEvent extends DomainEvent {
  static readonly eventName = 'conversation.resolved';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly resolvedBy?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class ConversationArchivedEvent extends DomainEvent {
  static readonly eventName = 'conversation.archived';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class MessageReceivedEvent extends DomainEvent {
  static readonly eventName = 'message.received';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly content: string,
    public readonly senderType: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class MessageSentEvent extends DomainEvent {
  static readonly eventName = 'message.sent';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly content: string,
    public readonly recipientId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class TicketCreatedEvent extends DomainEvent {
  static readonly eventName = 'ticket.created';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly title: string,
    public readonly priority: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketResolvedEvent extends DomainEvent {
  static readonly eventName = 'ticket.resolved';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly resolvedBy: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class CustomerCreatedEvent extends DomainEvent {
  static readonly eventName = 'customer.created';
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly name: string,
    public readonly email?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.customerId;
  }
}

export class CustomerUpdatedEvent extends DomainEvent {
  static readonly eventName = 'customer.updated';
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly name: string,
    public readonly email?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.customerId;
  }
}

export class CustomerDeletedEvent extends DomainEvent {
  static readonly eventName = 'customer.deleted';
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.customerId;
  }
}

export class CustomerRestoredEvent extends DomainEvent {
  static readonly eventName = 'customer.restored';
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.customerId;
  }
}

export class CustomerSegmentAssignedEvent extends DomainEvent {
  static readonly eventName = 'customer.segment_assigned';
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly segmentId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.customerId;
  }
}

export class CustomerMetricsUpdatedEvent extends DomainEvent {
  static readonly eventName = 'customer.metrics_updated';
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly metrics: any,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.customerId;
  }
}


export class ConnectorExecutedEvent extends DomainEvent {
  static readonly eventName = 'connector.executed';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
    public readonly capabilityName: string,
    public readonly status: number,
    public readonly latencyMs: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class WorkflowStartedEvent extends DomainEvent {
  static readonly eventName = 'workflow.started';
  constructor(
    public readonly tenantId: string,
    public readonly workflowId: string,
    public readonly executionId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowId;
  }
}

export class WorkflowCompletedEvent extends DomainEvent {
  static readonly eventName = 'workflow.completed';
  constructor(
    public readonly tenantId: string,
    public readonly workflowId: string,
    public readonly executionId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowId;
  }
}

export class TeamCreatedEvent extends DomainEvent {
  static readonly eventName = 'team.created';
  constructor(
    public readonly tenantId: string,
    public readonly teamId: string,
    public readonly name: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.teamId;
  }
}

export class TeamUpdatedEvent extends DomainEvent {
  static readonly eventName = 'team.updated';
  constructor(
    public readonly tenantId: string,
    public readonly teamId: string,
    public readonly name: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.teamId;
  }
}

export class TeamArchivedEvent extends DomainEvent {
  static readonly eventName = 'team.archived';
  constructor(
    public readonly tenantId: string,
    public readonly teamId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.teamId;
  }
}

export class AgentCreatedEvent extends DomainEvent {
  static readonly eventName = 'agent.created';
  constructor(
    public readonly tenantId: string,
    public readonly agentProfileId: string,
    public readonly userId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.agentProfileId;
  }
}

export class AgentUpdatedEvent extends DomainEvent {
  static readonly eventName = 'agent.updated';
  constructor(
    public readonly tenantId: string,
    public readonly agentProfileId: string,
    public readonly userId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.agentProfileId;
  }
}

export class AgentAssignedEvent extends DomainEvent {
  static readonly eventName = 'agent.assigned';
  constructor(
    public readonly tenantId: string,
    public readonly agentProfileId: string,
    public readonly teamId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.agentProfileId;
  }
}

export class AgentTransferredEvent extends DomainEvent {
  static readonly eventName = 'agent.transferred';
  constructor(
    public readonly tenantId: string,
    public readonly agentProfileId: string,
    public readonly fromTeamId: string,
    public readonly toTeamId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.agentProfileId;
  }
}

export class AvailabilityUpdatedEvent extends DomainEvent {
  static readonly eventName = 'availability.updated';
  constructor(
    public readonly tenantId: string,
    public readonly agentProfileId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.agentProfileId;
  }
}

export class AssignmentCompletedEvent extends DomainEvent {
  static readonly eventName = 'assignment.completed';
  constructor(
    public readonly tenantId: string,
    public readonly assignmentId: string,
    public readonly agentProfileId: string,
    public readonly entityId: string, // ticketId or conversationId
    public readonly strategy: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.assignmentId;
  }
}

export class ChannelCreatedEvent extends DomainEvent {
  static readonly eventName = 'channel.created';
  constructor(
    public readonly tenantId: string,
    public readonly channelId: string,
    public readonly name: string,
    public readonly type: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.channelId;
  }
}

export class ChannelUpdatedEvent extends DomainEvent {
  static readonly eventName = 'channel.updated';
  constructor(
    public readonly tenantId: string,
    public readonly channelId: string,
    public readonly name: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.channelId;
  }
}

export class ChannelDisabledEvent extends DomainEvent {
  static readonly eventName = 'channel.disabled';
  constructor(
    public readonly tenantId: string,
    public readonly channelId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.channelId;
  }
}

export class ChannelEnabledEvent extends DomainEvent {
  static readonly eventName = 'channel.enabled';
  constructor(
    public readonly tenantId: string,
    public readonly channelId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.channelId;
  }
}

export class ChannelHealthFailedEvent extends DomainEvent {
  static readonly eventName = 'channel.health.failed';
  constructor(
    public readonly tenantId: string,
    public readonly channelId: string,
    public readonly error: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.channelId;
  }
}

export class ChannelHealthRestoredEvent extends DomainEvent {
  static readonly eventName = 'channel.health.restored';
  constructor(
    public readonly tenantId: string,
    public readonly channelId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.channelId;
  }
}

export class MessageNormalizedEvent extends DomainEvent {
  static readonly eventName = 'message.normalized';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly channelId: string,
    public readonly originalPayload: any,
    public readonly normalizedPayload: any,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class MessageFailedEvent extends DomainEvent {
  static readonly eventName = 'message.failed';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly channelId: string,
    public readonly error: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class WebhookReceivedEvent extends DomainEvent {
  static readonly eventName = 'webhook.received';
  constructor(
    public readonly tenantId: string,
    public readonly webhookId: string,
    public readonly channelId: string,
    public readonly payload: any,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.webhookId;
  }
}


