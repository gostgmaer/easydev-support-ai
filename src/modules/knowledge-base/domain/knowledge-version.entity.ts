import { Entity } from '@easydev/shared-kernel';

export interface KnowledgeVersionProps {
  tenantId: string;
  documentId: string;
  versionNumber: number;
  changeSummary?: string;
  contentHash?: string;
  snapshot?: Record<string, any>;
  publishedBy?: string;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeVersion extends Entity<string> {
  private props: KnowledgeVersionProps;

  constructor(id: string, props: KnowledgeVersionProps) {
    super(id);
    this.props = {
      ...props,
      publishedAt: props.publishedAt || new Date(),
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
  get versionNumber(): number {
    return this.props.versionNumber;
  }
  get changeSummary(): string | undefined {
    return this.props.changeSummary;
  }
  get contentHash(): string | undefined {
    return this.props.contentHash;
  }
  get snapshot(): Record<string, any> | undefined {
    return this.props.snapshot;
  }
  get publishedBy(): string | undefined {
    return this.props.publishedBy;
  }
  get publishedAt(): Date {
    return this.props.publishedAt!;
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
      versionNumber: this.versionNumber,
      changeSummary: this.changeSummary,
      contentHash: this.contentHash,
      snapshot: this.snapshot,
      publishedBy: this.publishedBy,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
