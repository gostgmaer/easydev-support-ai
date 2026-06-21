import { DomainEvent } from '@easydev/shared-kernel';

// ─── FLOW 12: Multi-Tenant Lifecycle ─────────────────────────────────────────

export class TenantCreatedEvent extends DomainEvent {
  static readonly eventName = 'tenant.created';
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
    public readonly plan: string,
    public readonly createdBy: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.tenantId;
  }
}

export class TenantBrandingUpdatedEvent extends DomainEvent {
  static readonly eventName = 'tenant.branding.updated';
  constructor(
    public readonly tenantId: string,
    public readonly logoUrl?: string,
    public readonly primaryColor?: string,
    public readonly customDomain?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.tenantId;
  }
}

export class TenantPlanChangedEvent extends DomainEvent {
  static readonly eventName = 'tenant.plan.changed';
  constructor(
    public readonly tenantId: string,
    public readonly previousPlan: string,
    public readonly newPlan: string,
    public readonly effectiveAt: Date,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.tenantId;
  }
}

export class TenantSuspendedEvent extends DomainEvent {
  static readonly eventName = 'tenant.suspended';
  constructor(
    public readonly tenantId: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.tenantId;
  }
}

export class TenantReactivatedEvent extends DomainEvent {
  static readonly eventName = 'tenant.reactivated';
  constructor(public readonly tenantId: string) {
    super();
  }
  getAggregateId(): string {
    return this.tenantId;
  }
}

export class BillingInvoiceCreatedEvent extends DomainEvent {
  static readonly eventName = 'billing.invoice.created';
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly amountCents: number,
    public readonly currency: string,
    public readonly dueAt: Date,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.invoiceId;
  }
}

export class BillingPaymentSucceededEvent extends DomainEvent {
  static readonly eventName = 'billing.payment.succeeded';
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly amountCents: number,
    public readonly provider: string,
    public readonly providerTxId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.invoiceId;
  }
}

export class BillingPaymentFailedEvent extends DomainEvent {
  static readonly eventName = 'billing.payment.failed';
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly failureReason: string,
    public readonly nextRetryAt?: Date,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.invoiceId;
  }
}

// ─── FLOW 4: Ticket Deflection ────────────────────────────────────────────────

export class TicketDeflectedEvent extends DomainEvent {
  static readonly eventName = 'ticket.deflected';
  constructor(
    public readonly tenantId: string,
    public readonly sessionId: string,
    public readonly documentId: string,
    public readonly query: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sessionId;
  }
}

// ─── FLOW 3: Order Lookup ─────────────────────────────────────────────────────

export class OrderLookupExecutedEvent extends DomainEvent {
  static readonly eventName = 'order.lookup.executed';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly orderId: string,
    public readonly status: string,
    public readonly connectorId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class OrderLookupFailedEvent extends DomainEvent {
  static readonly eventName = 'order.lookup.failed';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly orderId: string,
    public readonly reason: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

// ─── FLOW 6: Email Channel Drafts ─────────────────────────────────────────────

export class EmailDraftGeneratedEvent extends DomainEvent {
  static readonly eventName = 'email.draft.generated';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly draftId: string,
    public readonly agentId?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class EmailDraftApprovedEvent extends DomainEvent {
  static readonly eventName = 'email.draft.approved';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly draftId: string,
    public readonly agentId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class EmailDraftRejectedEvent extends DomainEvent {
  static readonly eventName = 'email.draft.rejected';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly draftId: string,
    public readonly agentId: string,
    public readonly reason?: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class EmailReplySentEvent extends DomainEvent {
  static readonly eventName = 'email.reply.sent';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly messageId: string,
    public readonly agentId: string,
    public readonly recipientEmail: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

// ─── FLOW 1: Conversation Resolution ─────────────────────────────────────────

export class ConversationResolutionStartedEvent extends DomainEvent {
  static readonly eventName = 'conversation.resolution.started';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly agentId: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

export class CustomerNotifiedOnResolutionEvent extends DomainEvent {
  static readonly eventName = 'customer.notified.resolution';
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
    public readonly customerId: string,
    public readonly channel: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.conversationId;
  }
}

// ─── FLOW 5: Help Center AI Assistance ───────────────────────────────────────

export class HelpCenterAiAssistRequestedEvent extends DomainEvent {
  static readonly eventName = 'helpcenter.ai.assist.requested';
  constructor(
    public readonly tenantId: string,
    public readonly sessionId: string,
    public readonly query: string,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sessionId;
  }
}

export class HelpCenterAiAssistCompletedEvent extends DomainEvent {
  static readonly eventName = 'helpcenter.ai.assist.completed';
  constructor(
    public readonly tenantId: string,
    public readonly sessionId: string,
    public readonly answer: string,
    public readonly escalated: boolean,
  ) {
    super();
  }
  getAggregateId(): string {
    return this.sessionId;
  }
}
