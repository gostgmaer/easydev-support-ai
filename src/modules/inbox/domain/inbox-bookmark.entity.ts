import { Entity } from '@easydev/shared-kernel';

export interface InboxBookmarkProps {
  tenantId: string;
  conversationId: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class InboxBookmark extends Entity<string> {
  private props: InboxBookmarkProps;

  constructor(id: string, props: InboxBookmarkProps) {
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
  get userId(): string {
    return this.props.userId;
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
      userId: this.userId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
