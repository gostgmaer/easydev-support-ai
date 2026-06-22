import { Entity } from '@easydev/shared-kernel';
import { SystemHealthStatus, SystemHealthStatusEnum } from './value-objects';

export interface SystemHealthProps {
  tenantId: string;
  serviceName: string;
  status: SystemHealthStatus;
  latencyMs?: number;
  errorRate?: number;
  lastCheckAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class SystemHealth extends Entity<string> {
  private props: SystemHealthProps;

  constructor(id: string, props: SystemHealthProps) {
    super(id);
    this.props = {
      ...props,
      lastCheckAt: props.lastCheckAt || new Date(),
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get serviceName(): string {
    return this.props.serviceName;
  }
  get status(): SystemHealthStatus {
    return this.props.status;
  }
  get latencyMs(): number | undefined {
    return this.props.latencyMs;
  }
  get errorRate(): number | undefined {
    return this.props.errorRate;
  }
  get lastCheckAt(): Date {
    return this.props.lastCheckAt!;
  }
  get metadata(): Record<string, any> {
    return this.props.metadata || {};
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
    props: {
      tenantId: string;
      serviceName: string;
      status: SystemHealthStatusEnum;
      latencyMs?: number;
      errorRate?: number;
      metadata?: Record<string, any>;
    },
  ): SystemHealth {
    return new SystemHealth(id, {
      ...props,
      status: SystemHealthStatus.create(props.status),
    });
  }

  public recordCheck(
    status: SystemHealthStatusEnum,
    latencyMs?: number,
    errorRate?: number,
    metadata?: Record<string, any>,
  ): void {
    this.props.status = SystemHealthStatus.create(status);
    this.props.latencyMs = latencyMs;
    this.props.errorRate = errorRate;
    this.props.lastCheckAt = new Date();
    if (metadata)
      this.props.metadata = { ...(this.props.metadata || {}), ...metadata };
    this.props.updatedAt = new Date();
  }

  public hasChangedStatusSince(
    previousStatus?: SystemHealthStatusEnum,
  ): boolean {
    return previousStatus !== undefined && previousStatus !== this.status.value;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      serviceName: this.serviceName,
      status: this.status.value,
      latencyMs: this.latencyMs,
      errorRate: this.errorRate,
      lastCheckAt: this.lastCheckAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
