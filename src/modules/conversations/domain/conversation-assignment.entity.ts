import { Entity } from '@easydev/shared-kernel';

export interface ConversationAssignmentProps {
  tenantId: string;
  conversationId: string;
  agentProfileId?: string;
  teamId?: string;
  assignedAt?: Date;
  assignedBy?: string;
  assignmentType: string; // MANUAL, AUTO, ROUND_ROBIN, LEAST_LOADED, SKILL_BASED, PRIORITY_BASED
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationAssignment extends Entity<string> {
  private props: ConversationAssignmentProps;

  constructor(id: string, props: ConversationAssignmentProps) {
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
  get conversationId(): string {
    return this.props.conversationId;
  }
  get agentProfileId(): string | undefined {
    return this.props.agentProfileId;
  }
  get teamId(): string | undefined {
    return this.props.teamId;
  }
  get assignedAt(): Date {
    return this.props.assignedAt!;
  }
  get assignedBy(): string | undefined {
    return this.props.assignedBy;
  }
  get assignmentType(): string {
    return this.props.assignmentType;
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
      conversationId: this.conversationId,
      agentProfileId: this.agentProfileId,
      teamId: this.teamId,
      assignedAt: this.assignedAt,
      assignedBy: this.assignedBy,
      assignmentType: this.assignmentType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
