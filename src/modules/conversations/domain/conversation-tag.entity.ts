import { Entity } from '@easydev/shared-kernel';

export interface ConversationTagProps {
  tenantId: string;
  conversationId: string;
  tag: string;
  color?: string;
  isSystemTag: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationTag extends Entity<string> {
  private props: ConversationTagProps;

  constructor(id: string, props: ConversationTagProps) {
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
  get tag(): string {
    return this.props.tag;
  }
  get color(): string | undefined {
    return this.props.color;
  }
  get isSystemTag(): boolean {
    return this.props.isSystemTag;
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
      tag: this.tag,
      color: this.color,
      isSystemTag: this.isSystemTag,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
