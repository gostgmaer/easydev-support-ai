import { AggregateRoot } from '@easydev/shared-kernel';
import {
  ConnectorType,
  ConnectorStatus,
  ConnectorStatusEnum,
  AuthTypeEnum,
  HealthStatusEnum,
  CapabilityTypeEnum,
} from './value-objects';
import { ConnectorCapability } from './connector-capability.entity';
import {
  ConnectorCreatedEvent,
  ConnectorUpdatedEvent,
  ConnectorHealthFailedEvent,
  ConnectorHealthRestoredEvent,
} from '@easydev/shared-events';

export interface ConnectorProps {
  tenantId: string;
  name: string;
  slug: string;
  connectorType: ConnectorType;
  description?: string;
  baseUrl?: string;
  authType: AuthTypeEnum;
  status: ConnectorStatus;
  healthStatus?: HealthStatusEnum;
  openApiSpec?: Record<string, any>;
  config?: Record<string, any>;
  lastHealthCheckAt?: Date;
  lastError?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  capabilities?: ConnectorCapability[];
}

export class Connector extends AggregateRoot<string> {
  private props: ConnectorProps;

  constructor(id: string, props: ConnectorProps) {
    super(id);
    this.props = {
      ...props,
      healthStatus: props.healthStatus || HealthStatusEnum.UNKNOWN,
      config: props.config || {},
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
      capabilities: props.capabilities || [],
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get connectorType(): ConnectorType {
    return this.props.connectorType;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get baseUrl(): string | undefined {
    return this.props.baseUrl;
  }
  get authType(): AuthTypeEnum {
    return this.props.authType;
  }
  get status(): ConnectorStatus {
    return this.props.status;
  }
  get healthStatus(): HealthStatusEnum {
    return this.props.healthStatus || HealthStatusEnum.UNKNOWN;
  }
  get openApiSpec(): Record<string, any> | undefined {
    return this.props.openApiSpec;
  }
  get config(): Record<string, any> | undefined {
    return this.props.config;
  }
  get lastHealthCheckAt(): Date | undefined {
    return this.props.lastHealthCheckAt;
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
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get version(): number {
    return this.props.version || 1;
  }
  get capabilities(): ConnectorCapability[] {
    return this.props.capabilities!;
  }

  public static create(
    id: string,
    props: Omit<ConnectorProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): Connector {
    const connector = new Connector(id, props);
    connector.addDomainEvent(
      new ConnectorCreatedEvent(
        connector.tenantId,
        connector.id,
        connector.connectorType.value,
      ),
    );
    return connector;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
  }

  public update(
    props: Partial<
      Pick<
        ConnectorProps,
        | 'name'
        | 'description'
        | 'baseUrl'
        | 'authType'
        | 'status'
        | 'config'
        | 'openApiSpec'
        | 'metadata'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props };
    this.touch();
    this.addDomainEvent(
      new ConnectorUpdatedEvent(this.tenantId, this.id, this.status.value),
    );
  }

  public activate(): void {
    this.props.status = ConnectorStatus.create(ConnectorStatusEnum.ACTIVE);
    this.touch();
    this.addDomainEvent(
      new ConnectorUpdatedEvent(this.tenantId, this.id, this.status.value),
    );
  }

  public pause(): void {
    this.props.status = ConnectorStatus.create(ConnectorStatusEnum.PAUSED);
    this.touch();
    this.addDomainEvent(
      new ConnectorUpdatedEvent(this.tenantId, this.id, this.status.value),
    );
  }

  public disable(): void {
    this.props.status = ConnectorStatus.create(ConnectorStatusEnum.DISABLED);
    this.touch();
    this.addDomainEvent(
      new ConnectorUpdatedEvent(this.tenantId, this.id, this.status.value),
    );
  }

  public addCapability(capability: ConnectorCapability): void {
    const existingIdx = this.props.capabilities!.findIndex(
      (c) => c.capabilityType.value === capability.capabilityType.value,
    );
    if (existingIdx >= 0) {
      this.props.capabilities![existingIdx] = capability;
    } else {
      this.props.capabilities!.push(capability);
    }
    this.touch();
  }

  public removeCapability(capabilityType: CapabilityTypeEnum): void {
    this.props.capabilities = this.props.capabilities!.filter(
      (c) => c.capabilityType.value !== capabilityType,
    );
    this.touch();
  }

  public recordHealthy(at: Date = new Date()): void {
    const wasUnhealthy =
      this.props.healthStatus === HealthStatusEnum.UNHEALTHY ||
      this.props.healthStatus === HealthStatusEnum.DEGRADED;
    this.props.healthStatus = HealthStatusEnum.HEALTHY;
    this.props.lastHealthCheckAt = at;
    this.props.lastError = undefined;
    if (this.props.status.value === ConnectorStatusEnum.ERROR) {
      this.props.status = ConnectorStatus.create(ConnectorStatusEnum.ACTIVE);
    }
    this.props.updatedAt = new Date();
    if (wasUnhealthy) {
      this.addDomainEvent(
        new ConnectorHealthRestoredEvent(this.tenantId, this.id),
      );
    }
  }

  public recordUnhealthy(reason: string, at: Date = new Date()): void {
    const wasHealthy = this.props.healthStatus !== HealthStatusEnum.UNHEALTHY;
    this.props.healthStatus = HealthStatusEnum.UNHEALTHY;
    this.props.lastHealthCheckAt = at;
    this.props.lastError = reason;
    this.props.updatedAt = new Date();
    if (wasHealthy) {
      this.addDomainEvent(
        new ConnectorHealthFailedEvent(this.tenantId, this.id, reason),
      );
    }
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.status = ConnectorStatus.create(ConnectorStatusEnum.DISABLED);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      slug: this.slug,
      connectorType: this.connectorType.value,
      description: this.description,
      baseUrl: this.baseUrl,
      authType: this.authType,
      status: this.status.value,
      healthStatus: this.healthStatus,
      config: this.config,
      lastHealthCheckAt: this.lastHealthCheckAt,
      lastError: this.lastError,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      capabilities: this.capabilities.map((c) => c.toJSON()),
    };
  }
}
