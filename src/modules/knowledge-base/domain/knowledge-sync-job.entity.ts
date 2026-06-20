import { Entity } from '@easydev/shared-kernel';

export interface KnowledgeSyncJobProps {
  tenantId: string;
  sourceId: string;
  documentId?: string;
  jobType: 'SYNC' | 'CRAWL' | 'INGEST' | 'INDEX' | 'CLEANUP';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalItems?: number;
  processedItems?: number;
  failedItems?: number;
  error?: string;
  stats?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeSyncJob extends Entity<string> {
  private props: KnowledgeSyncJobProps;

  constructor(id: string, props: KnowledgeSyncJobProps) {
    super(id);
    this.props = {
      ...props,
      totalItems: props.totalItems ?? 0,
      processedItems: props.processedItems ?? 0,
      failedItems: props.failedItems ?? 0,
      status: props.status || 'PENDING',
      stats: props.stats || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get sourceId(): string {
    return this.props.sourceId;
  }
  get documentId(): string | undefined {
    return this.props.documentId;
  }
  get jobType(): 'SYNC' | 'CRAWL' | 'INGEST' | 'INDEX' | 'CLEANUP' {
    return this.props.jobType;
  }
  get status(): 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' {
    return this.props.status;
  }
  get totalItems(): number {
    return this.props.totalItems ?? 0;
  }
  get processedItems(): number {
    return this.props.processedItems ?? 0;
  }
  get failedItems(): number {
    return this.props.failedItems ?? 0;
  }
  get error(): string | undefined {
    return this.props.error;
  }
  get stats(): Record<string, any> | undefined {
    return this.props.stats;
  }
  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }
  get completedAt(): Date | undefined {
    return this.props.completedAt;
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

  public start(): void {
    this.props.status = 'RUNNING';
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public updateProgress(processed: number, failed: number, total?: number): void {
    this.props.processedItems = processed;
    this.props.failedItems = failed;
    if (total !== undefined) {
      this.props.totalItems = total;
    }
    this.props.updatedAt = new Date();
  }

  public complete(stats?: Record<string, any>): void {
    this.props.status = 'COMPLETED';
    this.props.completedAt = new Date();
    this.props.stats = { ...this.props.stats, ...stats };
    this.props.updatedAt = new Date();
  }

  public fail(error: string): void {
    this.props.status = 'FAILED';
    this.props.error = error;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      sourceId: this.sourceId,
      documentId: this.documentId,
      jobType: this.jobType,
      status: this.status,
      totalItems: this.totalItems,
      processedItems: this.processedItems,
      failedItems: this.failedItems,
      error: this.error,
      stats: this.stats,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
