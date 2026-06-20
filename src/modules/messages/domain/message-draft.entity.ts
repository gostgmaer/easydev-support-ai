import { Entity } from '@easydev/shared-kernel';

export interface MessageDraftProps {
  tenantId: string;
  conversationId: string;
  authorId: string;
  draftContent: string;
  draftType: string;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MessageDraft extends Entity<string> {
  private props: MessageDraftProps;

  constructor(id: string, props: MessageDraftProps) {
    super(id);
    this.props = {
      ...props,
      draftType: props.draftType || 'TEXT',
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
  get draftContent(): string {
    return this.props.draftContent;
  }
  get draftType(): string {
    return this.props.draftType;
  }
  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(draftContent: string, draftType?: string, expiresAt?: Date): void {
    this.props.draftContent = draftContent;
    if (draftType) this.props.draftType = draftType;
    if (expiresAt !== undefined) this.props.expiresAt = expiresAt;
    this.props.updatedAt = new Date();
  }

  public isExpired(at: Date = new Date()): boolean {
    return !!this.props.expiresAt && this.props.expiresAt.getTime() <= at.getTime();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      authorId: this.authorId,
      draftContent: this.draftContent,
      draftType: this.draftType,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
