import { Entity } from '@easydev/shared-kernel';

export interface MessageAttachmentProps {
  tenantId: string;
  messageId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  storageProvider?: string;
  storagePath?: string;
  publicUrl?: string;
  checksum?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MessageAttachment extends Entity<string> {
  private props: MessageAttachmentProps;

  constructor(id: string, props: MessageAttachmentProps) {
    super(id);
    this.props = {
      ...props,
      metadata: props.metadata || {},
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
  get fileName(): string {
    return this.props.fileName;
  }
  get fileType(): string | undefined {
    return this.props.fileType;
  }
  get fileSize(): number | undefined {
    return this.props.fileSize;
  }
  get storageProvider(): string | undefined {
    return this.props.storageProvider;
  }
  get storagePath(): string | undefined {
    return this.props.storagePath;
  }
  get publicUrl(): string | undefined {
    return this.props.publicUrl;
  }
  get checksum(): string | undefined {
    return this.props.checksum;
  }
  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }
  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public attachThumbnail(url: string): void {
    this.props.thumbnailUrl = url;
    this.props.updatedAt = new Date();
  }

  public attachStorageReference(ref: {
    storageProvider?: string;
    storagePath?: string;
    publicUrl?: string;
    checksum?: string;
  }): void {
    this.props.storageProvider = ref.storageProvider ?? this.props.storageProvider;
    this.props.storagePath = ref.storagePath ?? this.props.storagePath;
    this.props.publicUrl = ref.publicUrl ?? this.props.publicUrl;
    this.props.checksum = ref.checksum ?? this.props.checksum;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      messageId: this.messageId,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      storageProvider: this.storageProvider,
      storagePath: this.storagePath,
      publicUrl: this.publicUrl,
      checksum: this.checksum,
      thumbnailUrl: this.thumbnailUrl,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
