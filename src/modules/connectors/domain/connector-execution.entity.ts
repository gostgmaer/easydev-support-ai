import { Entity } from '@easydev/shared-kernel';
import { ExecutionStatusEnum } from './value-objects';

export interface ConnectorExecutionProps {
  tenantId: string;
  connectorId: string;
  instanceId?: string;
  capabilityId?: string;
  capabilityType: string;
  status?: ExecutionStatusEnum;
  statusCode?: number;
  requestPayload?: Record<string, any>;
  responsePayload?: Record<string, any>;
  error?: string;
  attempt?: number;
  latencyMs?: number;
  workflowId?: string;
  conversationId?: string;
  ticketId?: string;
  idempotencyKey?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ConnectorExecution extends Entity<string> {
  private props: ConnectorExecutionProps;

  constructor(id: string, props: ConnectorExecutionProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || ExecutionStatusEnum.PENDING,
      attempt: props.attempt || 1,
      latencyMs: props.latencyMs ?? 0,
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
  get instanceId(): string | undefined {
    return this.props.instanceId;
  }
  get capabilityId(): string | undefined {
    return this.props.capabilityId;
  }
  get capabilityType(): string {
    return this.props.capabilityType;
  }
  get status(): ExecutionStatusEnum {
    return this.props.status || ExecutionStatusEnum.PENDING;
  }
  get statusCode(): number | undefined {
    return this.props.statusCode;
  }
  get requestPayload(): Record<string, any> | undefined {
    return this.props.requestPayload;
  }
  get responsePayload(): Record<string, any> | undefined {
    return this.props.responsePayload;
  }
  get error(): string | undefined {
    return this.props.error;
  }
  get attempt(): number {
    return this.props.attempt || 1;
  }
  get latencyMs(): number {
    return this.props.latencyMs ?? 0;
  }
  get workflowId(): string | undefined {
    return this.props.workflowId;
  }
  get conversationId(): string | undefined {
    return this.props.conversationId;
  }
  get ticketId(): string | undefined {
    return this.props.ticketId;
  }
  get idempotencyKey(): string | undefined {
    return this.props.idempotencyKey;
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

  public markRunning(at: Date = new Date()): void {
    this.props.status = ExecutionStatusEnum.RUNNING;
    this.props.startedAt = at;
    this.props.updatedAt = new Date();
  }

  public markSuccess(
    statusCode: number,
    responsePayload: Record<string, any> | undefined,
    latencyMs: number,
  ): void {
    this.props.status = ExecutionStatusEnum.SUCCESS;
    this.props.statusCode = statusCode;
    this.props.responsePayload = responsePayload;
    this.props.latencyMs = latencyMs;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markFailed(
    error: string,
    latencyMs: number,
    statusCode?: number,
  ): void {
    this.props.status = ExecutionStatusEnum.FAILED;
    this.props.error = error;
    this.props.statusCode = statusCode;
    this.props.latencyMs = latencyMs;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markRetrying(): void {
    this.props.status = ExecutionStatusEnum.RETRYING;
    this.props.attempt = (this.props.attempt || 1) + 1;
    this.props.updatedAt = new Date();
  }

  public markCircuitOpen(): void {
    this.props.status = ExecutionStatusEnum.CIRCUIT_OPEN;
    this.props.error = 'Circuit breaker open';
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      connectorId: this.connectorId,
      instanceId: this.instanceId,
      capabilityId: this.capabilityId,
      capabilityType: this.capabilityType,
      status: this.status,
      statusCode: this.statusCode,
      requestPayload: this.requestPayload,
      responsePayload: this.responsePayload,
      error: this.error,
      attempt: this.attempt,
      latencyMs: this.latencyMs,
      workflowId: this.workflowId,
      conversationId: this.conversationId,
      ticketId: this.ticketId,
      idempotencyKey: this.idempotencyKey,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
