import { AggregateRoot } from '@easydev/shared-kernel';
import { TeamMember } from './team-member.entity';
import { AssignmentRule } from './assignment-rule.entity';
import {
  TeamCreatedEvent,
  TeamUpdatedEvent,
  TeamArchivedEvent,
  AgentAssignedEvent,
  AgentTransferredEvent,
} from '@easydev/shared-events';

export interface TeamProps {
  tenantId: string;
  name: string;
  description?: string;
  department?: string;
  priority: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  members?: TeamMember[];
  rules?: AssignmentRule[];
}

export class Team extends AggregateRoot<string> {
  private props: TeamProps;

  constructor(id: string, props: TeamProps) {
    super(id);
    this.props = {
      ...props,
      priority: props.priority ?? 1,
      isActive: props.isActive ?? true,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
      members: props.members || [],
      rules: props.rules || [],
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get department(): string | undefined { return this.props.department; }
  get priority(): number { return this.props.priority; }
  get isActive(): boolean { return this.props.isActive; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get deletedAt(): Date | undefined { return this.props.deletedAt; }
  get version(): number { return this.props.version!; }

  get members(): TeamMember[] { return this.props.members || []; }
  get rules(): AssignmentRule[] { return this.props.rules || []; }

  public static create(id: string, props: Omit<TeamProps, 'createdAt' | 'updatedAt' | 'version' | 'members' | 'rules'>): Team {
    const team = new Team(id, props);
    team.addDomainEvent(new TeamCreatedEvent(team.tenantId, team.id, team.name));
    return team;
  }

  public update(props: Partial<Pick<TeamProps, 'name' | 'description' | 'department' | 'priority' | 'isActive' | 'metadata'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
      version: this.props.version! + 1,
    };
    this.addDomainEvent(new TeamUpdatedEvent(this.tenantId, this.id, this.name));
  }

  public archive(): void {
    this.props.isActive = false;
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
    this.props.version = this.props.version! + 1;
    this.addDomainEvent(new TeamArchivedEvent(this.tenantId, this.id));
  }

  public addMember(member: TeamMember): void {
    const exists = this.members.some((m) => m.agentProfileId === member.agentProfileId);
    if (!exists) {
      this.members.push(member);
      this.props.updatedAt = new Date();
      this.addDomainEvent(new AgentAssignedEvent(this.tenantId, member.agentProfileId, this.id));
    }
  }

  public removeMember(agentProfileId: string): void {
    const index = this.members.findIndex((m) => m.agentProfileId === agentProfileId);
    if (index !== -1) {
      this.members.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public moveMember(agentProfileId: string, fromTeamId: string, toTeamId: string): void {
    const index = this.members.findIndex((m) => m.agentProfileId === agentProfileId);
    if (index !== -1) {
      this.members.splice(index, 1);
      this.props.updatedAt = new Date();
      this.addDomainEvent(new AgentTransferredEvent(this.tenantId, agentProfileId, fromTeamId, toTeamId));
    }
  }

  public addRule(rule: AssignmentRule): void {
    const exists = this.rules.some((r) => r.ruleType === rule.ruleType);
    if (!exists) {
      this.rules.push(rule);
      this.props.updatedAt = new Date();
    }
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      department: this.department,
      priority: this.priority,
      isActive: this.isActive,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      members: this.members.map((m) => m.toJSON()),
      rules: this.rules.map((r) => r.toJSON()),
    };
  }
}
