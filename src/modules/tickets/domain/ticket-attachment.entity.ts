import { Entity } from '@easydev/shared-kernel';

export interface TicketAttachmentProps {
  tenantId: string;
  ticketId: string;
  commentId?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  checksum?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketAttachment extends Entity<string> {
  private props: TicketAttachmentProps;

  constructor(id: string, props: TicketAttachmentProps) {
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
  get ticketId(): string {
    return this.props.ticketId;
  }
  get commentId(): string | undefined {
    return this.props.commentId;
  }
  get fileName(): string {
    return this.props.fileName;
  }
  get fileType(): string | undefined {
    return this.props.fileType;
  }
  get fileSize(): number | undefined {
    return this.props.fileSize;
  }
  get fileUrl(): string | undefined {
    return this.props.fileUrl;
  }
  get checksum(): string | undefined {
    return this.props.checksum;
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
      commentId: this.commentId,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      fileUrl: this.fileUrl,
      checksum: this.checksum,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
