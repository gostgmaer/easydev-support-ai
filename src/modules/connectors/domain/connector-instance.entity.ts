import { Entity } from '@easydev/shared-kernel';
import { HealthStatusEnum } from './value-objects';

export enum InstanceStatusEnum {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DISABLED = 'DISABLED',
}

export interface ConnectorInstanceProps {
  tenantId: string;
  connectorId: string;
  name: string;
  environment?: string;
  status?: InstanceStatusEnum;
  healthStatus?: HealthStatusEnum;
  config?: Record<string, any>;
  lastHealthCheckAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ConnectorInstance extends Entity<string> {
  private props: ConnectorInstanceProps;

  constructor(id: string, props: ConnectorInstanceProps) {
    super(id);
    this.props = {
      ...props,
      environment: props.environment || 'production',
      status: props.status || InstanceStatusEnum.ACTIVE,
      healthStatus: props.healthStatus || HealthStatusEnum.UNKNOWN,
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
  get connectorId(): string {
    return this.props.connectorId;
  }
  get name(): string {
    return this.props.name;
  }
  get environment(): string {
    return this.props.environment || 'production';
  }
  get status(): InstanceStatusEnum {
    return this.props.status || InstanceStatusEnum.ACTIVE;
  }
  get healthStatus(): HealthStatusEnum {
    return this.props.healthStatus || HealthStatusEnum.UNKNOWN;
  }
  get config(): Record<string, any> | undefined {
    return this.props.config;
  }
  get lastHealthCheckAt(): Date | undefined {
    return this.props.lastHealthCheckAt;
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

  public update(
    props: Partial<
      Pick<
        ConnectorInstanceProps,
        'name' | 'environment' | 'status' | 'config' | 'metadata'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props, updatedAt: new Date() };
  }

  public recordHealth(status: HealthStatusEnum, at: Date = new Date()): void {
    this.props.healthStatus = status;
    this.props.lastHealthCheckAt = at;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      connectorId: this.connectorId,
      name: this.name,
      environment: this.environment,
      status: this.status,
      healthStatus: this.healthStatus,
      config: this.config,
      lastHealthCheckAt: this.lastHealthCheckAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
