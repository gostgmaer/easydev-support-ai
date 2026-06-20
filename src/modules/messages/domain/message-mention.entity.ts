import { Entity } from '@easydev/shared-kernel';

export interface MessageMentionProps {
  tenantId: string;
  messageId: string;
  mentionedUserId: string;
  mentionedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MessageMention extends Entity<string> {
  private props: MessageMentionProps;

  constructor(id: string, props: MessageMentionProps) {
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
  get mentionedUserId(): string {
    return this.props.mentionedUserId;
  }
  get mentionedBy(): string {
    return this.props.mentionedBy;
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
      mentionedUserId: this.mentionedUserId,
      mentionedBy: this.mentionedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
