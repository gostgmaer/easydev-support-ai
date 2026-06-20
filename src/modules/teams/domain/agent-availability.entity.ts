import { Entity } from '@easydev/shared-kernel';

export interface AgentAvailabilityProps {
  tenantId: string;
  agentProfileId: string;
  status: string; // ONLINE, OFFLINE, AWAY
  lastSeenAt?: Date;
  workingHours?: Record<string, any>;
  currentLoad: number;
  activeConversations: number;
  activeTickets: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AgentAvailability extends Entity<string> {
  private props: AgentAvailabilityProps;

  constructor(id: string, props: AgentAvailabilityProps) {
    super(id);
    this.props = {
      ...props,
      lastSeenAt: props.lastSeenAt || new Date(),
      workingHours: props.workingHours || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get agentProfileId(): string {
    return this.props.agentProfileId;
  }
  get status(): string {
    return this.props.status;
  }
  get lastSeenAt(): Date {
    return this.props.lastSeenAt!;
  }
  get workingHours(): Record<string, any> {
    return this.props.workingHours || {};
  }
  get currentLoad(): number {
    return this.props.currentLoad;
  }
  get activeConversations(): number {
    return this.props.activeConversations;
  }
  get activeTickets(): number {
    return this.props.activeTickets;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(
    props: Partial<
      Omit<AgentAvailabilityProps, 'tenantId' | 'agentProfileId' | 'createdAt'>
    >,
  ): void {
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
      agentProfileId: this.agentProfileId,
      status: this.status,
      lastSeenAt: this.lastSeenAt,
      workingHours: this.workingHours,
      currentLoad: this.currentLoad,
      activeConversations: this.activeConversations,
      activeTickets: this.activeTickets,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
