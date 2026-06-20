import { Entity } from '@easydev/shared-kernel';

export interface ActivityFeedProps {
  tenantId: string;
  conversationId: string;
  eventType: string;
  actorId?: string;
  eventData?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ActivityFeed extends Entity<string> {
  private props: ActivityFeedProps;

  constructor(id: string, props: ActivityFeedProps) {
    super(id);
    this.props = {
      ...props,
      eventData: props.eventData || {},
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
  get eventType(): string {
    return this.props.eventType;
  }
  get actorId(): string | undefined {
    return this.props.actorId;
  }
  get eventData(): Record<string, any> | undefined {
    return this.props.eventData;
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
      eventType: this.eventType,
      actorId: this.actorId,
      eventData: this.eventData,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
