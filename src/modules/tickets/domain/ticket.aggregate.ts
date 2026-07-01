import { AggregateRoot } from '@easydev/shared-kernel';
import {
  TicketNumber,
  TicketStatus,
  TicketStatusEnum,
  TicketPriority,
  TicketSource,
} from './value-objects';
import { TicketComment } from './ticket-comment.entity';
import { TicketTag } from './ticket-tag.entity';
import { TicketWatcher } from './ticket-watcher.entity';
import { TicketApproval } from './ticket-approval.entity';
import {
  TicketCreatedEvent,
  TicketUpdatedEvent,
  TicketAssignedEvent,
  TicketTransferredEvent,
  TicketCommentedEvent,
  TicketEscalatedEvent,
  TicketResolvedEvent,
  TicketClosedEvent,
  TicketReopenedEvent,
  TicketApprovalRequestedEvent,
} from '@easydev/shared-events';

export interface TicketProps {
  tenantId: string;
  ticketNumber: TicketNumber;
  customerId?: string;
  conversationId?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  categoryId?: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  subject: string;
  description?: string;
  resolutionSummary?: string;
  openedAt?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  comments?: TicketComment[];
  tags?: TicketTag[];
  watchers?: TicketWatcher[];
  approvals?: TicketApproval[];
}

export class Ticket extends AggregateRoot<string> {
  private props: TicketProps;

  constructor(id: string, props: TicketProps) {
    super(id);
    this.props = {
      ...props,
      openedAt: props.openedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
      metadata: props.metadata || {},
      comments: props.comments || [],
      tags: props.tags || [],
      watchers: props.watchers || [],
      approvals: props.approvals || [],
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get ticketNumber(): TicketNumber {
    return this.props.ticketNumber;
  }
  get customerId(): string | undefined {
    return this.props.customerId;
  }
  get conversationId(): string | undefined {
    return this.props.conversationId;
  }
  get assignedAgentId(): string | undefined {
    return this.props.assignedAgentId;
  }
  get assignedTeamId(): string | undefined {
    return this.props.assignedTeamId;
  }
  get categoryId(): string | undefined {
    return this.props.categoryId;
  }
  get priority(): TicketPriority {
    return this.props.priority;
  }
  get status(): TicketStatus {
    return this.props.status;
  }
  get source(): TicketSource {
    return this.props.source;
  }
  get subject(): string {
    return this.props.subject;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get resolutionSummary(): string | undefined {
    return this.props.resolutionSummary;
  }
  get openedAt(): Date {
    return this.props.openedAt!;
  }
  get firstResponseAt(): Date | undefined {
    return this.props.firstResponseAt;
  }
  get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }
  get closedAt(): Date | undefined {
    return this.props.closedAt;
  }
  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get version(): number {
    return this.props.version!;
  }
  get comments(): TicketComment[] {
    return this.props.comments!;
  }
  get tags(): TicketTag[] {
    return this.props.tags!;
  }
  get watchers(): TicketWatcher[] {
    return this.props.watchers!;
  }
  get approvals(): TicketApproval[] {
    return this.props.approvals!;
  }

  public static create(
    id: string,
    props: Omit<TicketProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): Ticket {
    const ticket = new Ticket(id, props);
    ticket.addDomainEvent(
      new TicketCreatedEvent(
        ticket.tenantId,
        ticket.id,
        ticket.subject,
        ticket.priority.value,
        ticket.status.value,
      ),
    );
    return ticket;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version = this.props.version! + 1;
  }

  private emitUpdated(): void {
    this.addDomainEvent(
      new TicketUpdatedEvent(
        this.tenantId,
        this.id,
        this.status.value,
        this.priority.value,
      ),
    );
  }

  public update(
    props: Partial<
      Pick<
        TicketProps,
        | 'subject'
        | 'description'
        | 'priority'
        | 'categoryId'
        | 'status'
        | 'metadata'
      >
    >,
  ): void {
    // Status can be changed via this generic path too (e.g. workflow actions),
    // so it has to obey the same transition rules as the dedicated
    // start/resolve/close/reopen/cancel methods below - otherwise it's a
    // backdoor around all of them.
    if (props.status) {
      this.status.assertCanTransitionTo(props.status.value);
    }
    this.props = { ...this.props, ...props };
    this.touch();
    this.emitUpdated();
  }

  public markFirstResponse(): void {
    if (!this.props.firstResponseAt) {
      this.props.firstResponseAt = new Date();
      this.touch();
    }
  }

  public assign(agentId: string, teamId: string | undefined): void {
    this.props.assignedAgentId = agentId;
    if (teamId) this.props.assignedTeamId = teamId;
    if (!this.status.isTerminal()) {
      this.props.status = TicketStatus.create(TicketStatusEnum.ASSIGNED);
    }
    this.touch();
    this.addDomainEvent(
      new TicketAssignedEvent(this.tenantId, this.id, agentId, teamId),
    );
  }

  public transfer(toAgentId: string): void {
    const fromAgentId = this.props.assignedAgentId;
    this.props.assignedAgentId = toAgentId;
    this.props.status = TicketStatus.create(TicketStatusEnum.ASSIGNED);
    this.touch();
    this.addDomainEvent(
      new TicketTransferredEvent(
        this.tenantId,
        this.id,
        fromAgentId,
        toAgentId,
      ),
    );
  }

  public start(): void {
    this.status.assertCanTransitionTo(TicketStatusEnum.IN_PROGRESS);
    this.props.status = TicketStatus.create(TicketStatusEnum.IN_PROGRESS);
    this.touch();
    this.emitUpdated();
  }

  public escalate(reason: string): void {
    this.props.priority = this.props.priority.escalated();
    this.touch();
    this.addDomainEvent(
      new TicketEscalatedEvent(
        this.tenantId,
        this.id,
        reason,
        this.priority.value,
      ),
    );
  }

  public resolve(resolutionSummary?: string, resolvedBy?: string): void {
    if (this.props.approvals && this.props.approvals.some((a) => a.isPending)) {
      throw new Error('Cannot resolve ticket with pending approvals');
    }
    this.status.assertCanTransitionTo(TicketStatusEnum.RESOLVED);
    this.props.status = TicketStatus.create(TicketStatusEnum.RESOLVED);
    this.props.resolvedAt = new Date();
    if (resolutionSummary) this.props.resolutionSummary = resolutionSummary;
    this.touch();
    this.addDomainEvent(
      new TicketResolvedEvent(this.tenantId, this.id, resolvedBy || ''),
    );
  }

  public close(closedBy?: string): void {
    if (this.props.approvals && this.props.approvals.some((a) => a.isPending)) {
      throw new Error('Cannot close ticket with pending approvals');
    }
    this.status.assertCanTransitionTo(TicketStatusEnum.CLOSED);
    this.props.status = TicketStatus.create(TicketStatusEnum.CLOSED);
    this.props.closedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new TicketClosedEvent(this.tenantId, this.id, closedBy),
    );
  }

  public reopen(reopenedBy?: string): void {
    this.status.assertCanTransitionTo(TicketStatusEnum.REOPENED);
    this.props.status = TicketStatus.create(TicketStatusEnum.REOPENED);
    this.props.resolvedAt = undefined;
    this.props.closedAt = undefined;
    this.touch();
    this.addDomainEvent(
      new TicketReopenedEvent(this.tenantId, this.id, reopenedBy),
    );
  }

  public cancel(): void {
    this.status.assertCanTransitionTo(TicketStatusEnum.CANCELLED);
    this.props.status = TicketStatus.create(TicketStatusEnum.CANCELLED);
    this.touch();
    this.emitUpdated();
  }

  public requestApproval(approval: TicketApproval): void {
    this.props.approvals!.push(approval);
    this.props.status = TicketStatus.create(TicketStatusEnum.APPROVAL_PENDING);
    this.touch();
    this.addDomainEvent(
      new TicketApprovalRequestedEvent(
        this.tenantId,
        this.id,
        approval.id,
        approval.approverId,
        approval.type,
      ),
    );
  }

  public addComment(comment: TicketComment): void {
    this.props.comments!.push(comment);
    this.markFirstResponse();
    this.touch();
    this.addDomainEvent(
      new TicketCommentedEvent(
        this.tenantId,
        this.id,
        comment.id,
        comment.authorId,
        comment.visibility,
      ),
    );
  }

  public addTag(tag: TicketTag): void {
    if (this.props.tags!.some((t) => t.tag === tag.tag)) return;
    this.props.tags!.push(tag);
    this.touch();
  }

  public removeTag(tagValue: string): void {
    this.props.tags = this.props.tags!.filter((t) => t.tag !== tagValue);
    this.touch();
  }

  public addWatcher(watcher: TicketWatcher): void {
    if (this.props.watchers!.some((w) => w.userId === watcher.userId)) return;
    this.props.watchers!.push(watcher);
    this.touch();
  }

  public removeWatcher(userId: string): void {
    this.props.watchers = this.props.watchers!.filter(
      (w) => w.userId !== userId,
    );
    this.touch();
  }

  public setMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...(this.props.metadata || {}), ...metadata };
    this.touch();
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      ticketNumber: this.ticketNumber.value,
      customerId: this.customerId,
      conversationId: this.conversationId,
      assignedAgentId: this.assignedAgentId,
      assignedTeamId: this.assignedTeamId,
      categoryId: this.categoryId,
      priority: this.priority.value,
      status: this.status.value,
      source: this.source.value,
      subject: this.subject,
      description: this.description,
      resolutionSummary: this.resolutionSummary,
      openedAt: this.openedAt,
      firstResponseAt: this.firstResponseAt,
      resolvedAt: this.resolvedAt,
      closedAt: this.closedAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      comments: this.comments.map((c) => c.toJSON()),
      tags: this.tags.map((t) => t.toJSON()),
      watchers: this.watchers.map((w) => w.toJSON()),
      approvals: this.approvals.map((a) => a.toJSON()),
    };
  }
}
