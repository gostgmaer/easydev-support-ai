import { Entity } from '@easydev/shared-kernel';

export interface InboxSnoozeProps {
  tenantId: string;
  conversationId: string;
  snoozedUntil: Date;
  reason?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class InboxSnooze extends Entity<string> {
  private props: InboxSnoozeProps;

  constructor(id: string, props: InboxSnoozeProps) {
    super(id);
    this.props = {
      ...props,
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
  get snoozedUntil(): Date {
    return this.props.snoozedUntil;
  }
  get reason(): string | undefined {
    return this.props.reason;
  }
  get createdBy(): string | undefined {
    return this.props.createdBy;
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

  public isDue(at: Date = new Date()): boolean {
    return this.props.snoozedUntil.getTime() <= at.getTime();
  }

  public reschedule(snoozedUntil: Date, reason?: string): void {
    this.props.snoozedUntil = snoozedUntil;
    if (reason !== undefined) this.props.reason = reason;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      snoozedUntil: this.snoozedUntil,
      reason: this.reason,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
