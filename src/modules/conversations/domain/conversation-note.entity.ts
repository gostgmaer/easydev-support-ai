import { Entity } from '@easydev/shared-kernel';

export interface ConversationNoteProps {
  tenantId: string;
  conversationId: string;
  authorId: string;
  note: string;
  visibility: string; // INTERNAL, PRIVATE
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationNote extends Entity<string> {
  private props: ConversationNoteProps;

  constructor(id: string, props: ConversationNoteProps) {
    super(id);
    this.props = {
      ...props,
      visibility: props.visibility || 'INTERNAL',
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
  get authorId(): string {
    return this.props.authorId;
  }
  get note(): string {
    return this.props.note;
  }
  get visibility(): string {
    return this.props.visibility;
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
      authorId: this.authorId,
      note: this.note,
      visibility: this.visibility,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
