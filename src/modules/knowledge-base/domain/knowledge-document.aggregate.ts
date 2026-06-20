import { AggregateRoot } from '@easydev/shared-kernel';
import {
  DocumentStatus,
  DocumentStatusEnum,
  DocumentLanguage,
  DocumentTypeEnum,
  SyncStatusEnum,
  IngestionStatusEnum,
  EmbeddingStatusEnum,
} from './value-objects';
import {
  KnowledgeDocumentCreatedEvent,
  KnowledgeDocumentUpdatedEvent,
  KnowledgeDocumentPublishedEvent,
  KnowledgeDocumentArchivedEvent,
  KnowledgeIngestionStartedEvent,
  KnowledgeIngestionCompletedEvent,
  KnowledgeIngestionFailedEvent,
} from '@easydev/shared-events';

export interface KnowledgeDocumentProps {
  tenantId: string;
  sourceId: string;
  categoryId?: string;
  title: string;
  slug: string;
  documentType: DocumentTypeEnum;
  status: DocumentStatus;
  language: DocumentLanguage;
  version: number;
  syncStatus: SyncStatusEnum;
  ingestionStatus: IngestionStatusEnum;
  embeddingStatus: EmbeddingStatusEnum;
  externalRef?: string;
  sourceUri?: string;
  contentHash?: string;
  chunkCount?: number;
  fileUrl?: string;
  storageProvider?: string;
  fileSize?: number;
  mimeType?: string;
  checksum?: string;
  tags?: string[];
  publishedAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  aggregateVersion?: number; // Version of the aggregate record
}

export class KnowledgeDocument extends AggregateRoot<string> {
  private props: KnowledgeDocumentProps;

  constructor(id: string, props: KnowledgeDocumentProps) {
    super(id);
    this.props = {
      ...props,
      chunkCount: props.chunkCount ?? 0,
      tags: props.tags || [],
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      aggregateVersion: props.aggregateVersion || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get sourceId(): string {
    return this.props.sourceId;
  }
  get categoryId(): string | undefined {
    return this.props.categoryId;
  }
  get title(): string {
    return this.props.title;
  }
  get slug(): string {
    return this.props.slug;
  }
  get documentType(): DocumentTypeEnum {
    return this.props.documentType;
  }
  get status(): DocumentStatus {
    return this.props.status;
  }
  get language(): DocumentLanguage {
    return this.props.language;
  }
  get version(): number {
    return this.props.version;
  }
  get syncStatus(): SyncStatusEnum {
    return this.props.syncStatus;
  }
  get ingestionStatus(): IngestionStatusEnum {
    return this.props.ingestionStatus;
  }
  get embeddingStatus(): EmbeddingStatusEnum {
    return this.props.embeddingStatus;
  }
  get externalRef(): string | undefined {
    return this.props.externalRef;
  }
  get sourceUri(): string | undefined {
    return this.props.sourceUri;
  }
  get contentHash(): string | undefined {
    return this.props.contentHash;
  }
  get chunkCount(): number {
    return this.props.chunkCount ?? 0;
  }
  get fileUrl(): string | undefined {
    return this.props.fileUrl;
  }
  get storageProvider(): string | undefined {
    return this.props.storageProvider;
  }
  get fileSize(): number | undefined {
    return this.props.fileSize;
  }
  get mimeType(): string | undefined {
    return this.props.mimeType;
  }
  get checksum(): string | undefined {
    return this.props.checksum;
  }
  get tags(): string[] {
    return this.props.tags || [];
  }
  get publishedAt(): Date | undefined {
    return this.props.publishedAt;
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
  get aggregateVersion(): number {
    return this.props.aggregateVersion || 1;
  }

  public static create(
    id: string,
    props: Omit<KnowledgeDocumentProps, 'createdAt' | 'updatedAt' | 'aggregateVersion'>,
  ): KnowledgeDocument {
    const doc = new KnowledgeDocument(id, props);
    doc.addDomainEvent(
      new KnowledgeDocumentCreatedEvent(
        doc.tenantId,
        doc.id,
        doc.sourceId,
        doc.status.value,
      ),
    );
    return doc;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.aggregateVersion = (this.props.aggregateVersion || 1) + 1;
  }

  public update(props: Partial<Pick<KnowledgeDocumentProps, 'title' | 'categoryId' | 'tags' | 'metadata' | 'contentHash'>>): void {
    this.props = { ...this.props, ...props };
    this.touch();
    this.addDomainEvent(
      new KnowledgeDocumentUpdatedEvent(this.tenantId, this.id, this.status.value),
    );
  }

  public startIngestion(jobId: string): void {
    this.props.status = DocumentStatus.create(DocumentStatusEnum.PROCESSING);
    this.props.ingestionStatus = IngestionStatusEnum.INGESTING;
    this.props.syncStatus = SyncStatusEnum.SYNCING;
    this.touch();
    this.addDomainEvent(
      new KnowledgeIngestionStartedEvent(this.tenantId, this.id, jobId),
    );
  }

  public completeIngestion(chunkCount: number): void {
    this.props.status = DocumentStatus.create(DocumentStatusEnum.INDEXING);
    this.props.ingestionStatus = IngestionStatusEnum.INGESTED;
    this.props.embeddingStatus = EmbeddingStatusEnum.EMBEDDING;
    this.props.chunkCount = chunkCount;
    this.touch();
    this.addDomainEvent(
      new KnowledgeIngestionCompletedEvent(this.tenantId, this.id, chunkCount),
    );
  }

  public failIngestion(reason: string): void {
    this.props.status = DocumentStatus.create(DocumentStatusEnum.FAILED);
    this.props.ingestionStatus = IngestionStatusEnum.FAILED;
    this.props.embeddingStatus = EmbeddingStatusEnum.FAILED;
    this.props.syncStatus = SyncStatusEnum.FAILED;
    if (this.props.metadata) {
      this.props.metadata.ingestionError = reason;
    }
    this.touch();
    this.addDomainEvent(
      new KnowledgeIngestionFailedEvent(this.tenantId, this.id, reason),
    );
  }

  public markEmbedded(): void {
    this.props.embeddingStatus = EmbeddingStatusEnum.EMBEDDED;
    this.props.status = DocumentStatus.create(DocumentStatusEnum.ACTIVE);
    this.props.syncStatus = SyncStatusEnum.SYNCED;
    this.touch();
  }

  public publish(publishedBy?: string): void {
    this.props.status = DocumentStatus.create(DocumentStatusEnum.ACTIVE);
    this.props.publishedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
    this.touch();
    this.addDomainEvent(
      new KnowledgeDocumentPublishedEvent(
        this.tenantId,
        this.id,
        this.version,
        publishedBy,
      ),
    );
  }

  public archive(archivedBy?: string): void {
    this.props.status = DocumentStatus.create(DocumentStatusEnum.ARCHIVED);
    this.touch();
    this.addDomainEvent(
      new KnowledgeDocumentArchivedEvent(this.tenantId, this.id, archivedBy),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      sourceId: this.sourceId,
      categoryId: this.categoryId,
      title: this.title,
      slug: this.slug,
      documentType: this.documentType,
      status: this.status.value,
      language: this.language.value,
      version: this.version,
      syncStatus: this.syncStatus,
      ingestionStatus: this.ingestionStatus,
      embeddingStatus: this.embeddingStatus,
      externalRef: this.externalRef,
      sourceUri: this.sourceUri,
      contentHash: this.contentHash,
      chunkCount: this.chunkCount,
      fileUrl: this.fileUrl,
      storageProvider: this.storageProvider,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      checksum: this.checksum,
      tags: this.tags,
      publishedAt: this.publishedAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      aggregateVersion: this.aggregateVersion,
    };
  }
}
