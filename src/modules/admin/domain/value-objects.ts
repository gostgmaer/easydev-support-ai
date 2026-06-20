import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class DashboardId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid DashboardId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): DashboardId {
    return new DashboardId(value);
  }
}

export class WidgetId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid WidgetId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WidgetId {
    return new WidgetId(value);
  }
}

export class ApiKeyId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid ApiKeyId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ApiKeyId {
    return new ApiKeyId(value);
  }
}

export class WebhookId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid WebhookId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WebhookId {
    return new WebhookId(value);
  }
}

export class IncidentId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid IncidentId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): IncidentId {
    return new IncidentId(value);
  }
}

export enum AdminWidgetTypeEnum {
  CONVERSATION_METRICS = 'CONVERSATION_METRICS',
  TICKET_METRICS = 'TICKET_METRICS',
  AI_METRICS = 'AI_METRICS',
  WORKFLOW_METRICS = 'WORKFLOW_METRICS',
  CONNECTOR_METRICS = 'CONNECTOR_METRICS',
  CUSTOMER_METRICS = 'CUSTOMER_METRICS',
  AGENT_METRICS = 'AGENT_METRICS',
  REVENUE_METRICS = 'REVENUE_METRICS',
  SLA_METRICS = 'SLA_METRICS',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
}

export class AdminWidgetType extends ValueObject<{ value: AdminWidgetTypeEnum }> {
  constructor(value: AdminWidgetTypeEnum) {
    if (!Object.values(AdminWidgetTypeEnum).includes(value)) {
      throw new Error(`Invalid AdminWidgetType: ${value}`);
    }
    super({ value });
  }

  get value(): AdminWidgetTypeEnum {
    return this.props.value;
  }

  public static create(value: AdminWidgetTypeEnum): AdminWidgetType {
    return new AdminWidgetType(value);
  }
}

export enum ApiKeyStatusEnum {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export class ApiKeyStatus extends ValueObject<{ value: ApiKeyStatusEnum }> {
  constructor(value: ApiKeyStatusEnum) {
    if (!Object.values(ApiKeyStatusEnum).includes(value)) {
      throw new Error(`Invalid ApiKeyStatus: ${value}`);
    }
    super({ value });
  }

  get value(): ApiKeyStatusEnum {
    return this.props.value;
  }

  public isUsable(): boolean {
    return this.props.value === ApiKeyStatusEnum.ACTIVE;
  }

  public static create(value: ApiKeyStatusEnum): ApiKeyStatus {
    return new ApiKeyStatus(value);
  }
}

export enum WebhookStatusEnum {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  FAILING = 'FAILING',
}

export class WebhookStatus extends ValueObject<{ value: WebhookStatusEnum }> {
  constructor(value: WebhookStatusEnum) {
    if (!Object.values(WebhookStatusEnum).includes(value)) {
      throw new Error(`Invalid WebhookStatus: ${value}`);
    }
    super({ value });
  }

  get value(): WebhookStatusEnum {
    return this.props.value;
  }

  public static create(value: WebhookStatusEnum): WebhookStatus {
    return new WebhookStatus(value);
  }
}

export enum IncidentSeverityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatusEnum {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
}

export class IncidentStatus extends ValueObject<{ value: IncidentStatusEnum }> {
  constructor(value: IncidentStatusEnum) {
    if (!Object.values(IncidentStatusEnum).includes(value)) {
      throw new Error(`Invalid IncidentStatus: ${value}`);
    }
    super({ value });
  }

  get value(): IncidentStatusEnum {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return this.props.value === IncidentStatusEnum.RESOLVED;
  }

  public static create(value: IncidentStatusEnum): IncidentStatus {
    return new IncidentStatus(value);
  }
}

export enum SystemHealthStatusEnum {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
}

export class SystemHealthStatus extends ValueObject<{ value: SystemHealthStatusEnum }> {
  constructor(value: SystemHealthStatusEnum) {
    if (!Object.values(SystemHealthStatusEnum).includes(value)) {
      throw new Error(`Invalid SystemHealthStatus: ${value}`);
    }
    super({ value });
  }

  get value(): SystemHealthStatusEnum {
    return this.props.value;
  }

  public isOperational(): boolean {
    return this.props.value !== SystemHealthStatusEnum.DOWN;
  }

  public static create(value: SystemHealthStatusEnum): SystemHealthStatus {
    return new SystemHealthStatus(value);
  }
}

export enum AnnouncementSeverityEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}
