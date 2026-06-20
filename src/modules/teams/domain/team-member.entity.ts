import { Entity } from '@easydev/shared-kernel';

export interface TeamMemberProps {
  tenantId: string;
  teamId: string;
  agentProfileId: string;
  role: string; // LEADER, MEMBER
  joinedAt?: Date;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TeamMember extends Entity<string> {
  private props: TeamMemberProps;

  constructor(id: string, props: TeamMemberProps) {
    super(id);
    this.props = {
      ...props,
      joinedAt: props.joinedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get teamId(): string { return this.props.teamId; }
  get agentProfileId(): string { return this.props.agentProfileId; }
  get role(): string { return this.props.role; }
  get joinedAt(): Date { return this.props.joinedAt!; }
  get isPrimary(): boolean { return this.props.isPrimary; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }

  public update(props: Partial<Pick<TeamMemberProps, 'role' | 'isPrimary'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      teamId: this.teamId,
      agentProfileId: this.agentProfileId,
      role: this.role,
      joinedAt: this.joinedAt,
      isPrimary: this.isPrimary,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
