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
