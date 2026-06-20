import { Entity } from '@easydev/shared-kernel';
import { AssignmentType } from './value-objects';

export interface InboxAssignmentProps {
  tenantId: string;
  conversationId: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  assignmentType: AssignmentType;
  assignedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class InboxAssignment extends Entity<string> {
  private props: InboxAssignmentProps;

  constructor(id: string, props: InboxAssignmentProps) {
    super(id);
    this.props = {
      ...props,
      assignedAt: props.assignedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get conversationId(): string {
    return this.props.conversationId;
  }
  get assignedAgentId(): string | undefined {
    return this.props.assignedAgentId;
  }
  get assignedTeamId(): string | undefined {
    return this.props.assignedTeamId;
  }
  get assignmentType(): AssignmentType {
    return this.props.assignmentType;
  }
  get assignedAt(): Date {
    return this.props.assignedAt!;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      assignedAgentId: this.assignedAgentId,
      assignedTeamId: this.assignedTeamId,
      assignmentType: this.assignmentType.value,
      assignedAt: this.assignedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
