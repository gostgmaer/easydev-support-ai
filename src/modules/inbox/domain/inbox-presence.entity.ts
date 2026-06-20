import { Entity } from '@easydev/shared-kernel';
import { PresenceStatus, PresenceStatusEnum } from './value-objects';

export interface InboxPresenceProps {
  tenantId: string;
  userId: string;
  status: PresenceStatus;
  lastSeenAt?: Date;
  activeConversationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class InboxPresence extends Entity<string> {
  private props: InboxPresenceProps;

  constructor(id: string, props: InboxPresenceProps) {
    super(id);
    this.props = {
      ...props,
      lastSeenAt: props.lastSeenAt || new Date(),
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
  get status(): PresenceStatus {
    return this.props.status;
  }
  get lastSeenAt(): Date {
    return this.props.lastSeenAt!;
  }
  get activeConversationId(): string | undefined {
    return this.props.activeConversationId;
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

  public updateStatus(
    status: PresenceStatusEnum,
    activeConversationId?: string,
  ): void {
    this.props.status = PresenceStatus.create(status);
    this.props.lastSeenAt = new Date();
    if (activeConversationId !== undefined) {
      this.props.activeConversationId = activeConversationId;
    }
    this.props.updatedAt = new Date();
  }

  public heartbeat(): void {
    this.props.lastSeenAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      status: this.status.value,
      lastSeenAt: this.lastSeenAt,
      activeConversationId: this.activeConversationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
