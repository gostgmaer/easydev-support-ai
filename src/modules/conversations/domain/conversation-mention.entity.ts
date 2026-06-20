import { Entity } from '@easydev/shared-kernel';

export interface ConversationMentionProps {
  tenantId: string;
  conversationId: string;
  mentionedUserId: string;
  mentionedBy: string;
  messageReference?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationMention extends Entity<string> {
  private props: ConversationMentionProps;

  constructor(id: string, props: ConversationMentionProps) {
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
  get conversationId(): string {
    return this.props.conversationId;
  }
  get mentionedUserId(): string {
    return this.props.mentionedUserId;
  }
  get mentionedBy(): string {
    return this.props.mentionedBy;
  }
  get messageReference(): string | undefined {
    return this.props.messageReference;
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
      conversationId: this.conversationId,
      mentionedUserId: this.mentionedUserId,
      mentionedBy: this.mentionedBy,
      messageReference: this.messageReference,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
