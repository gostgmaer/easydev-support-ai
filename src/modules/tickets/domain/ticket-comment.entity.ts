import { Entity } from '@easydev/shared-kernel';

export interface TicketCommentProps {
  tenantId: string;
  ticketId: string;
  authorId: string;
  comment: string;
  visibility: string; // PUBLIC, INTERNAL
  attachmentsCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketComment extends Entity<string> {
  private props: TicketCommentProps;

  constructor(id: string, props: TicketCommentProps) {
    super(id);
    this.props = {
      ...props,
      visibility: props.visibility || 'PUBLIC',
      attachmentsCount: props.attachmentsCount ?? 0,
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
  get authorId(): string {
    return this.props.authorId;
  }
  get comment(): string {
    return this.props.comment;
  }
  get visibility(): string {
    return this.props.visibility;
  }
  get attachmentsCount(): number {
    return this.props.attachmentsCount;
  }
  get isInternal(): boolean {
    return this.props.visibility === 'INTERNAL';
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public incrementAttachments(by = 1): void {
    this.props.attachmentsCount += by;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      ticketId: this.ticketId,
      authorId: this.authorId,
      comment: this.comment,
      visibility: this.visibility,
      attachmentsCount: this.attachmentsCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
