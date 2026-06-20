import { Entity } from '@easydev/shared-kernel';

export enum ApprovalStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalTypeEnum {
  REFUND = 'REFUND',
  CREDIT = 'CREDIT',
  ESCALATION = 'ESCALATION',
  CUSTOM = 'CUSTOM',
}

export interface TicketApprovalProps {
  tenantId: string;
  ticketId: string;
  approverId: string;
  status: string;
  type: string;
  comments?: string;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketApproval extends Entity<string> {
  private props: TicketApprovalProps;

  constructor(id: string, props: TicketApprovalProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || ApprovalStatusEnum.PENDING,
      type: props.type || ApprovalTypeEnum.CUSTOM,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get ticketId(): string {
    return this.props.ticketId;
  }
  get approverId(): string {
    return this.props.approverId;
  }
  get status(): string {
    return this.props.status;
  }
  get type(): string {
    return this.props.type;
  }
  get comments(): string | undefined {
    return this.props.comments;
  }
  get approvedAt(): Date | undefined {
    return this.props.approvedAt;
  }
  get isPending(): boolean {
    return this.props.status === ApprovalStatusEnum.PENDING;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public approve(comments?: string): void {
    if (!this.isPending) {
      throw new Error(`Approval ${this.id} is already ${this.props.status}`);
    }
    this.props.status = ApprovalStatusEnum.APPROVED;
    this.props.comments = comments ?? this.props.comments;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public reject(comments?: string): void {
    if (!this.isPending) {
      throw new Error(`Approval ${this.id} is already ${this.props.status}`);
    }
    this.props.status = ApprovalStatusEnum.REJECTED;
    this.props.comments = comments ?? this.props.comments;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      ticketId: this.ticketId,
      approverId: this.approverId,
      status: this.status,
      type: this.type,
      comments: this.comments,
      approvedAt: this.approvedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
