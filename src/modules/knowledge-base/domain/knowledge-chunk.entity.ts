import { Entity } from '@easydev/shared-kernel';

export interface KnowledgeChunkProps {
  tenantId: string;
  documentId: string;
  chunkIndex: number;
  chunkHash: string;
  content: string;
  tokenCount?: number;
  externalRef?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeChunk extends Entity<string> {
  private props: KnowledgeChunkProps;

  constructor(id: string, props: KnowledgeChunkProps) {
    super(id);
    this.props = {
      ...props,
      tokenCount: props.tokenCount ?? 0,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get documentId(): string {
    return this.props.documentId;
  }
  get chunkIndex(): number {
    return this.props.chunkIndex;
  }
  get chunkHash(): string {
    return this.props.chunkHash;
  }
  get content(): string {
    return this.props.content;
  }
  get tokenCount(): number {
    return this.props.tokenCount ?? 0;
  }
  get externalRef(): string | undefined {
    return this.props.externalRef;
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
  get version(): number {
    return this.props.version || 1;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      documentId: this.documentId,
      chunkIndex: this.chunkIndex,
      chunkHash: this.chunkHash,
      content: this.content,
      tokenCount: this.tokenCount,
      externalRef: this.externalRef,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
