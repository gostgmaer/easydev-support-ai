import { AggregateRoot } from '@easydev/shared-kernel';
import { SourceTypeEnum, SyncStatusEnum } from './value-objects';
import {
  KnowledgeSourceCreatedEvent,
  KnowledgeSyncStartedEvent,
  KnowledgeSyncCompletedEvent,
} from '@easydev/shared-events';

export interface KnowledgeSourceProps {
  tenantId: string;
  name: string;
  description?: string;
  sourceType: SourceTypeEnum;
  status?: string; // ACTIVE, PAUSED, DISABLED
  syncStatus?: SyncStatusEnum; // PENDING, SYNCING, SYNCED, FAILED
  uri?: string;
  connectorId?: string;
  config?: Record<string, any>;
  documentCount?: number;
  lastSyncedAt?: Date;
  lastError?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgeSource extends AggregateRoot<string> {
  private props: KnowledgeSourceProps;

  constructor(id: string, props: KnowledgeSourceProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || 'ACTIVE',
      syncStatus: props.syncStatus || SyncStatusEnum.PENDING,
      documentCount: props.documentCount ?? 0,
      config: props.config || {},
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get sourceType(): SourceTypeEnum {
    return this.props.sourceType;
  }
  get status(): string {
    return this.props.status || 'ACTIVE';
  }
  get syncStatus(): SyncStatusEnum {
    return this.props.syncStatus || SyncStatusEnum.PENDING;
  }
  get uri(): string | undefined {
    return this.props.uri;
  }
  get connectorId(): string | undefined {
    return this.props.connectorId;
  }
  get config(): Record<string, any> | undefined {
    return this.props.config;
  }
  get documentCount(): number {
    return this.props.documentCount ?? 0;
  }
  get lastSyncedAt(): Date | undefined {
    return this.props.lastSyncedAt;
  }
  get lastError(): string | undefined {
    return this.props.lastError;
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

  public static create(
    id: string,
    props: Omit<KnowledgeSourceProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): KnowledgeSource {
    const source = new KnowledgeSource(id, props);
    source.addDomainEvent(
      new KnowledgeSourceCreatedEvent(
        source.tenantId,
        source.id,
        source.sourceType,
      ),
    );
    return source;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
  }

  public update(
    props: Partial<
      Pick<
        KnowledgeSourceProps,
        'name' | 'description' | 'config' | 'metadata' | 'uri'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props };
    this.touch();
  }

  public startSync(jobId: string): void {
    this.props.syncStatus = SyncStatusEnum.SYNCING;
    this.touch();
    this.addDomainEvent(
      new KnowledgeSyncStartedEvent(this.tenantId, this.id, jobId),
    );
  }

  public completeSync(docCount: number): void {
    this.props.syncStatus = SyncStatusEnum.SYNCED;
    this.props.documentCount = docCount;
    this.props.lastSyncedAt = new Date();
    this.props.lastError = undefined;
    this.touch();
    this.addDomainEvent(
      new KnowledgeSyncCompletedEvent(this.tenantId, this.id, docCount),
    );
  }

  public failSync(reason: string): void {
    this.props.syncStatus = SyncStatusEnum.FAILED;
    this.props.lastError = reason;
    this.props.lastSyncedAt = new Date();
    this.touch();
  }

  public pause(): void {
    this.props.status = 'PAUSED';
    this.touch();
  }

  public activate(): void {
    this.props.status = 'ACTIVE';
    this.touch();
  }

  public disable(): void {
    this.props.status = 'DISABLED';
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      sourceType: this.sourceType,
      status: this.status,
      syncStatus: this.syncStatus,
      uri: this.uri,
      connectorId: this.connectorId,
      config: this.config,
      documentCount: this.documentCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
