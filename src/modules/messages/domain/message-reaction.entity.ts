import { Entity } from '@easydev/shared-kernel';

export interface MessageReactionProps {
  tenantId: string;
  messageId: string;
  userId: string;
  reaction: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MessageReaction extends Entity<string> {
  private props: MessageReactionProps;

  constructor(id: string, props: MessageReactionProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get messageId(): string {
    return this.props.messageId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get reaction(): string {
    return this.props.reaction;
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
      messageId: this.messageId,
      userId: this.userId,
      reaction: this.reaction,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
