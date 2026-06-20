import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class ConnectorId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid ConnectorId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ConnectorId {
    return new ConnectorId(value);
  }
}

export class InstanceId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid InstanceId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): InstanceId {
    return new InstanceId(value);
  }
}

export class CapabilityId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid CapabilityId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CapabilityId {
    return new CapabilityId(value);
  }
}

export class ExecutionId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid ExecutionId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ExecutionId {
    return new ExecutionId(value);
  }
}

export class CredentialId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid CredentialId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CredentialId {
    return new CredentialId(value);
  }
}

export enum ConnectorTypeEnum {
  REST_API = 'REST_API',
  GRAPHQL = 'GRAPHQL',
  WEBHOOK = 'WEBHOOK',
  SHOPIFY = 'SHOPIFY',
  WOOCOMMERCE = 'WOOCOMMERCE',
  MAGENTO = 'MAGENTO',
  HUBSPOT = 'HUBSPOT',
  SALESFORCE = 'SALESFORCE',
  ZOHO = 'ZOHO',
  JIRA = 'JIRA',
  CUSTOM = 'CUSTOM',
}

export class ConnectorType extends ValueObject<{ value: ConnectorTypeEnum }> {
  constructor(value: ConnectorTypeEnum) {
    if (!Object.values(ConnectorTypeEnum).includes(value)) {
      throw new Error(`Invalid ConnectorType: ${value}`);
    }
    super({ value });
  }

  get value(): ConnectorTypeEnum {
    return this.props.value;
  }

  public static create(value: ConnectorTypeEnum): ConnectorType {
    return new ConnectorType(value);
  }
}

export enum CapabilityTypeEnum {
  ORDER_TRACKING = 'ORDER_TRACKING',
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  PRODUCT_DETAILS = 'PRODUCT_DETAILS',
  INVENTORY_LOOKUP = 'INVENTORY_LOOKUP',
  CUSTOMER_LOOKUP = 'CUSTOMER_LOOKUP',
  CRM_LOOKUP = 'CRM_LOOKUP',
  INVOICE_LOOKUP = 'INVOICE_LOOKUP',
  PAYMENT_LOOKUP = 'PAYMENT_LOOKUP',
  REFUND_REQUEST = 'REFUND_REQUEST',
  RETURN_REQUEST = 'RETURN_REQUEST',
  APPOINTMENT_BOOKING = 'APPOINTMENT_BOOKING',
  LEAD_CREATION = 'LEAD_CREATION',
  SUBSCRIPTION_LOOKUP = 'SUBSCRIPTION_LOOKUP',
  TICKET_CREATION = 'TICKET_CREATION',
  CUSTOM_ACTION = 'CUSTOM_ACTION',
}

export class CapabilityType extends ValueObject<{ value: CapabilityTypeEnum }> {
  constructor(value: CapabilityTypeEnum) {
    if (!Object.values(CapabilityTypeEnum).includes(value)) {
      throw new Error(`Invalid CapabilityType: ${value}`);
    }
    super({ value });
  }

  get value(): CapabilityTypeEnum {
    return this.props.value;
  }

  public static create(value: CapabilityTypeEnum): CapabilityType {
    return new CapabilityType(value);
  }
}

export enum ConnectorStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DISABLED = 'DISABLED',
  ERROR = 'ERROR',
}

export class ConnectorStatus extends ValueObject<{
  value: ConnectorStatusEnum;
}> {
  constructor(value: ConnectorStatusEnum) {
    if (!Object.values(ConnectorStatusEnum).includes(value)) {
      throw new Error(`Invalid ConnectorStatus: ${value}`);
    }
    super({ value });
  }

  get value(): ConnectorStatusEnum {
    return this.props.value;
  }

  public isActive(): boolean {
    return this.props.value === ConnectorStatusEnum.ACTIVE;
  }

  public static create(value: ConnectorStatusEnum): ConnectorStatus {
    return new ConnectorStatus(value);
  }
}

export enum AuthTypeEnum {
  NONE = 'NONE',
  API_KEY = 'API_KEY',
  BEARER = 'BEARER',
  BASIC = 'BASIC',
  OAUTH2 = 'OAUTH2',
  HMAC = 'HMAC',
}

export enum HealthStatusEnum {
  UNKNOWN = 'UNKNOWN',
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export enum ExecutionStatusEnum {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
}
