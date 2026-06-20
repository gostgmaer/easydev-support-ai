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

export class MessageCreatedEvent extends DomainEvent {
  static readonly eventName = 'message.created';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly direction: string,
    public readonly messageType: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class MessageDeliveredEvent extends DomainEvent {
  static readonly eventName = 'message.delivered';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly provider?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class MessageReadEvent extends DomainEvent {
  static readonly eventName = 'message.read';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly readBy?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class MessageRetriedEvent extends DomainEvent {
  static readonly eventName = 'message.retried';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly attempt: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class MessageArchivedEvent extends DomainEvent {
  static readonly eventName = 'message.archived';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly conversationId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class AttachmentUploadedEvent extends DomainEvent {
  static readonly eventName = 'attachment.uploaded';
  constructor(
    public readonly tenantId: string,
    public readonly attachmentId: string,
    public readonly messageId: string,
    public readonly fileName: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.attachmentId;
  }
}

export class AttachmentDeletedEvent extends DomainEvent {
  static readonly eventName = 'attachment.deleted';
  constructor(
    public readonly tenantId: string,
    public readonly attachmentId: string,
    public readonly messageId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.attachmentId;
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

export class TicketUpdatedEvent extends DomainEvent {
  static readonly eventName = 'ticket.updated';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly status: string,
    public readonly priority: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketAssignedEvent extends DomainEvent {
  static readonly eventName = 'ticket.assigned';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly agentId: string,
    public readonly teamId?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketTransferredEvent extends DomainEvent {
  static readonly eventName = 'ticket.transferred';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly fromAgentId: string | undefined,
    public readonly toAgentId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketCommentedEvent extends DomainEvent {
  static readonly eventName = 'ticket.commented';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly commentId: string,
    public readonly authorId: string,
    public readonly visibility: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketEscalatedEvent extends DomainEvent {
  static readonly eventName = 'ticket.escalated';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly reason: string,
    public readonly priority: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketClosedEvent extends DomainEvent {
  static readonly eventName = 'ticket.closed';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly closedBy?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketReopenedEvent extends DomainEvent {
  static readonly eventName = 'ticket.reopened';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly reopenedBy?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketApprovalRequestedEvent extends DomainEvent {
  static readonly eventName = 'ticket.approval.requested';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly approvalId: string,
    public readonly approverId: string,
    public readonly type: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketApprovedEvent extends DomainEvent {
  static readonly eventName = 'ticket.approved';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly approvalId: string,
    public readonly approverId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class TicketRejectedEvent extends DomainEvent {
  static readonly eventName = 'ticket.rejected';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly approvalId: string,
    public readonly approverId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.ticketId;
  }
}

export class SlaBreachedEvent extends DomainEvent {
  static readonly eventName = 'sla.breached';
  constructor(
    public readonly tenantId: string,
    public readonly ticketId: string,
    public readonly slaId: string,
    public readonly breachType: string,
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



export class KnowledgeSourceCreatedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.source.created';
  constructor(
    public readonly tenantId: string,
    public readonly sourceId: string,
    public readonly sourceType: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sourceId;
  }
}

export class KnowledgeDocumentCreatedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.document.created';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly sourceId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeDocumentUpdatedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.document.updated';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeDocumentPublishedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.document.published';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly versionNumber: number,
    public readonly publishedBy?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeDocumentArchivedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.document.archived';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly archivedBy?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeIngestionStartedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.ingestion.started';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly jobId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeIngestionCompletedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.ingestion.completed';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly chunkCount: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeIngestionFailedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.ingestion.failed';
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.documentId;
  }
}

export class KnowledgeSyncStartedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.sync.started';
  constructor(
    public readonly tenantId: string,
    public readonly sourceId: string,
    public readonly jobId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sourceId;
  }
}

export class KnowledgeSyncCompletedEvent extends DomainEvent {
  static readonly eventName = 'knowledge.sync.completed';
  constructor(
    public readonly tenantId: string,
    public readonly sourceId: string,
    public readonly documentsProcessed: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sourceId;
  }
}

export class ConnectorCreatedEvent extends DomainEvent {
  static readonly eventName = 'connector.created';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
    public readonly connectorType: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class ConnectorUpdatedEvent extends DomainEvent {
  static readonly eventName = 'connector.updated';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class ConnectorFailedEvent extends DomainEvent {
  static readonly eventName = 'connector.failed';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
    public readonly capabilityName: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class ConnectorRetryEvent extends DomainEvent {
  static readonly eventName = 'connector.retry';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
    public readonly executionId: string,
    public readonly attempt: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class ConnectorHealthFailedEvent extends DomainEvent {
  static readonly eventName = 'connector.health.failed';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class ConnectorHealthRestoredEvent extends DomainEvent {
  static readonly eventName = 'connector.health.restored';
  constructor(
    public readonly tenantId: string,
    public readonly connectorId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.connectorId;
  }
}

export class AiWorkflowStartedEvent extends DomainEvent {
  static readonly eventName = 'ai.workflow.started';
  constructor(
    public readonly tenantId: string,
    public readonly workflowExecutionId: string,
    public readonly workflowId: string,
    public readonly conversationId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowExecutionId;
  }
}

export class AiWorkflowCompletedEvent extends DomainEvent {
  static readonly eventName = 'ai.workflow.completed';
  constructor(
    public readonly tenantId: string,
    public readonly workflowExecutionId: string,
    public readonly workflowId: string,
    public readonly conversationId: string,
    public readonly tokensUsed: number,
    public readonly estimatedCost: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowExecutionId;
  }
}

export class AiWorkflowFailedEvent extends DomainEvent {
  static readonly eventName = 'ai.workflow.failed';
  constructor(
    public readonly tenantId: string,
    public readonly workflowExecutionId: string,
    public readonly workflowId: string,
    public readonly conversationId: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowExecutionId;
  }
}

export class AiToolRequestedEvent extends DomainEvent {
  static readonly eventName = 'ai.tool.requested';
  constructor(
    public readonly tenantId: string,
    public readonly toolRequestId: string,
    public readonly workflowExecutionId: string,
    public readonly toolName: string,
    public readonly capability: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.toolRequestId;
  }
}

export class AiToolCompletedEvent extends DomainEvent {
  static readonly eventName = 'ai.tool.completed';
  constructor(
    public readonly tenantId: string,
    public readonly toolRequestId: string,
    public readonly workflowExecutionId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.toolRequestId;
  }
}

export class AiResponseGeneratedEvent extends DomainEvent {
  static readonly eventName = 'ai.response.generated';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly messageId: string,
    public readonly responseType: string,
    public readonly tokensUsed: number,
    public readonly cost: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class AiEscalationCreatedEvent extends DomainEvent {
  static readonly eventName = 'ai.escalation.created';
  constructor(
    public readonly tenantId: string,
    public readonly escalationId: string,
    public readonly conversationId: string,
    public readonly reason: string,
    public readonly escalatedTo: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.escalationId;
  }
}

export class AiEscalationResolvedEvent extends DomainEvent {
  static readonly eventName = 'ai.escalation.resolved';
  constructor(
    public readonly tenantId: string,
    public readonly escalationId: string,
    public readonly conversationId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.escalationId;
  }
}

export class AiUsageRecordedEvent extends DomainEvent {
  static readonly eventName = 'ai.usage.recorded';
  constructor(
    public readonly tenantId: string,
    public readonly agentId: string,
    public readonly date: string,
    public readonly tokensUsed: number,
    public readonly cost: number,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.agentId;
  }
}

export class WorkflowCreatedEvent extends DomainEvent {
  static readonly eventName = 'workflow.created';
  constructor(
    public readonly tenantId: string,
    public readonly workflowId: string,
    public readonly name: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowId;
  }
}

export class WorkflowUpdatedEvent extends DomainEvent {
  static readonly eventName = 'workflow.updated';
  constructor(
    public readonly tenantId: string,
    public readonly workflowId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowId;
  }
}

export class WorkflowActivatedEvent extends DomainEvent {
  static readonly eventName = 'workflow.activated';
  constructor(
    public readonly tenantId: string,
    public readonly workflowId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowId;
  }
}

export class WorkflowPausedEvent extends DomainEvent {
  static readonly eventName = 'workflow.paused';
  constructor(
    public readonly tenantId: string,
    public readonly workflowId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.workflowId;
  }
}

export class WorkflowExecutionStartedEvent extends DomainEvent {
  static readonly eventName = 'workflow.execution.started';
  constructor(
    public readonly tenantId: string,
    public readonly executionId: string,
    public readonly workflowId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.executionId;
  }
}

export class WorkflowExecutionCompletedEvent extends DomainEvent {
  static readonly eventName = 'workflow.execution.completed';
  constructor(
    public readonly tenantId: string,
    public readonly executionId: string,
    public readonly workflowId: string,
    public readonly result?: any,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.executionId;
  }
}

export class WorkflowExecutionFailedEvent extends DomainEvent {
  static readonly eventName = 'workflow.execution.failed';
  constructor(
    public readonly tenantId: string,
    public readonly executionId: string,
    public readonly workflowId: string,
    public readonly error: any,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.executionId;
  }
}

export class WorkflowApprovalRequestedEvent extends DomainEvent {
  static readonly eventName = 'workflow.approval.requested';
  constructor(
    public readonly tenantId: string,
    public readonly approvalId: string,
    public readonly executionId: string,
    public readonly approverId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.approvalId;
  }
}

export class WorkflowApprovedEvent extends DomainEvent {
  static readonly eventName = 'workflow.approved';
  constructor(
    public readonly tenantId: string,
    public readonly approvalId: string,
    public readonly executionId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.approvalId;
  }
}

export class WorkflowRejectedEvent extends DomainEvent {
  static readonly eventName = 'workflow.rejected';
  constructor(
    public readonly tenantId: string,
    public readonly approvalId: string,
    public readonly executionId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.approvalId;
  }
}

export class InboxUpdatedEvent extends DomainEvent {
  static readonly eventName = 'inbox.updated';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class InboxAssignmentChangedEvent extends DomainEvent {
  static readonly eventName = 'inbox.assignment.changed';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly assignedAgentId?: string,
    public readonly assignedTeamId?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class InboxBookmarkedEvent extends DomainEvent {
  static readonly eventName = 'inbox.bookmarked';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly bookmarked: boolean,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class InboxSnoozedEvent extends DomainEvent {
  static readonly eventName = 'inbox.snoozed';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly snoozedUntil: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class InboxPresenceUpdatedEvent extends DomainEvent {
  static readonly eventName = 'inbox.presence.updated';
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.userId;
  }
}

export class InboxViewCreatedEvent extends DomainEvent {
  static readonly eventName = 'inbox.view.created';
  constructor(
    public readonly tenantId: string,
    public readonly savedViewId: string,
    public readonly userId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.savedViewId;
  }
}

export class AdminDashboardUpdatedEvent extends DomainEvent {
  static readonly eventName = 'admin.dashboard.updated';
  constructor(
    public readonly tenantId: string,
    public readonly dashboardId: string,
    public readonly userId?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.dashboardId;
  }
}

export class AdminApiKeyCreatedEvent extends DomainEvent {
  static readonly eventName = 'admin.api_key.created';
  constructor(
    public readonly tenantId: string,
    public readonly apiKeyId: string,
    public readonly name: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.apiKeyId;
  }
}

export class AdminApiKeyRevokedEvent extends DomainEvent {
  static readonly eventName = 'admin.api_key.revoked';
  constructor(
    public readonly tenantId: string,
    public readonly apiKeyId: string,
    public readonly reason?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.apiKeyId;
  }
}

export class AdminWebhookCreatedEvent extends DomainEvent {
  static readonly eventName = 'admin.webhook.created';
  constructor(
    public readonly tenantId: string,
    public readonly webhookId: string,
    public readonly url: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.webhookId;
  }
}

export class AdminWebhookFailedEvent extends DomainEvent {
  static readonly eventName = 'admin.webhook.failed';
  constructor(
    public readonly tenantId: string,
    public readonly webhookId: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.webhookId;
  }
}

export class AdminIncidentCreatedEvent extends DomainEvent {
  static readonly eventName = 'admin.incident.created';
  constructor(
    public readonly tenantId: string,
    public readonly incidentId: string,
    public readonly severity: string,
    public readonly affectedService: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.incidentId;
  }
}

export class AdminIncidentResolvedEvent extends DomainEvent {
  static readonly eventName = 'admin.incident.resolved';
  constructor(
    public readonly tenantId: string,
    public readonly incidentId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.incidentId;
  }
}

export class SystemHealthChangedEvent extends DomainEvent {
  static readonly eventName = 'system.health.changed';
  constructor(
    public readonly tenantId: string,
    public readonly serviceName: string,
    public readonly status: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.serviceName;
  }
}

export class TenantOverrideCreatedEvent extends DomainEvent {
  static readonly eventName = 'tenant.override.created';
  constructor(
    public readonly tenantId: string,
    public readonly overrideId: string,
    public readonly featureKey: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.overrideId;
  }
}

export class WidgetInstalledEvent extends DomainEvent {
  static readonly eventName = 'widget.installed';
  constructor(
    public readonly tenantId: string,
    public readonly installationId: string,
    public readonly domain: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.installationId;
  }
}

export class WidgetUpdatedEvent extends DomainEvent {
  static readonly eventName = 'widget.updated';
  constructor(
    public readonly tenantId: string,
    public readonly widgetConfigId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.widgetConfigId;
  }
}

export class WidgetVisitorCreatedEvent extends DomainEvent {
  static readonly eventName = 'widget.visitor.created';
  constructor(
    public readonly tenantId: string,
    public readonly visitorId: string,
    public readonly anonymousId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.visitorId;
  }
}

export class WidgetVisitorIdentifiedEvent extends DomainEvent {
  static readonly eventName = 'widget.visitor.identified';
  constructor(
    public readonly tenantId: string,
    public readonly visitorId: string,
    public readonly externalUserId?: string,
    public readonly email?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.visitorId;
  }
}

export class WidgetSessionStartedEvent extends DomainEvent {
  static readonly eventName = 'widget.session.started';
  constructor(
    public readonly tenantId: string,
    public readonly sessionId: string,
    public readonly visitorId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sessionId;
  }
}

export class WidgetSessionEndedEvent extends DomainEvent {
  static readonly eventName = 'widget.session.ended';
  constructor(
    public readonly tenantId: string,
    public readonly sessionId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sessionId;
  }
}

export class WidgetLeadCreatedEvent extends DomainEvent {
  static readonly eventName = 'widget.lead.created';
  constructor(
    public readonly tenantId: string,
    public readonly leadId: string,
    public readonly email: string,
    public readonly source: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.leadId;
  }
}

export class WidgetMessageSentEvent extends DomainEvent {
  static readonly eventName = 'widget.message.sent';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly sessionId: string,
    public readonly visitorId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}

export class WidgetMessageReceivedEvent extends DomainEvent {
  static readonly eventName = 'widget.message.received';
  constructor(
    public readonly tenantId: string,
    public readonly messageId: string,
    public readonly sessionId: string,
    public readonly visitorId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.messageId;
  }
}


