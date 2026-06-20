import { Entity } from '@easydev/shared-kernel';

export interface TicketAssignmentProps {
  tenantId: string;
  ticketId: string;
  agentId?: string;
  teamId?: string;
  assignmentType: string; // MANUAL, AUTO, ROUND_ROBIN, LEAST_LOADED, SKILL_BASED, PRIORITY_BASED, TRANSFER, ESCALATION
  assignedAt?: Date;
  assignedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketAssignment extends Entity<string> {
  private props: TicketAssignmentProps;

  constructor(id: string, props: TicketAssignmentProps) {
    super(id);
    this.props = {
      ...props,
      assignmentType: props.assignmentType || 'MANUAL',
      assignedAt: props.assignedAt || new Date(),
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
  get agentId(): string | undefined {
    return this.props.agentId;
  }
  get teamId(): string | undefined {
    return this.props.teamId;
  }
  get assignmentType(): string {
    return this.props.assignmentType;
  }
  get assignedAt(): Date {
    return this.props.assignedAt!;
  }
  get assignedBy(): string | undefined {
    return this.props.assignedBy;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      ticketId: this.ticketId,
      agentId: this.agentId,
      teamId: this.teamId,
      assignmentType: this.assignmentType,
      assignedAt: this.assignedAt,
      assignedBy: this.assignedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
