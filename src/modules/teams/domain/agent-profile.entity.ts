import { Entity } from '@easydev/shared-kernel';
import { AgentCapacity } from './value-objects';

export interface AgentProfileProps {
  tenantId: string;
  userId: string;
  employeeCode?: string;
  displayName: string;
  avatarUrl?: string;
  status: string; // ACTIVE, INACTIVE
  capacity: AgentCapacity;
  skillScore: number;
  timezone: string;
  languagePreferences?: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
}

export class AgentProfile extends Entity<string> {
  private props: AgentProfileProps;

  constructor(id: string, props: AgentProfileProps) {
    super(id);
    this.props = {
      ...props,
      languagePreferences: props.languagePreferences || [],
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get employeeCode(): string | undefined {
    return this.props.employeeCode;
  }
  get displayName(): string {
    return this.props.displayName;
  }
  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }
  get status(): string {
    return this.props.status;
  }
  get capacity(): AgentCapacity {
    return this.props.capacity;
  }
  get skillScore(): number {
    return this.props.skillScore;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get languagePreferences(): string[] {
    return this.props.languagePreferences || [];
  }
  get metadata(): Record<string, any> {
    return this.props.metadata || {};
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
    return this.props.version || 1;
  }

  public update(
    props: Partial<
      Omit<AgentProfileProps, 'tenantId' | 'userId' | 'createdAt'>
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
      userId: this.userId,
      employeeCode: this.employeeCode,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      status: this.status,
      capacity: {
        capacity: this.capacity.capacity,
        maxConcurrentConversations: this.capacity.maxConcurrentConversations,
        maxOpenTickets: this.capacity.maxOpenTickets,
      },
      skillScore: this.skillScore,
      timezone: this.timezone,
      languagePreferences: this.languagePreferences,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
