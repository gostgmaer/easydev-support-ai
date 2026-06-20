import { Entity } from '@easydev/shared-kernel';

export interface TicketWatcherProps {
  tenantId: string;
  ticketId: string;
  userId: string;
  notificationPreferences?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketWatcher extends Entity<string> {
  private props: TicketWatcherProps;

  constructor(id: string, props: TicketWatcherProps) {
    super(id);
    this.props = {
      ...props,
      notificationPreferences: props.notificationPreferences || {},
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
  get userId(): string {
    return this.props.userId;
  }
  get notificationPreferences(): Record<string, any> | undefined {
    return this.props.notificationPreferences;
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
      userId: this.userId,
      notificationPreferences: this.notificationPreferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
