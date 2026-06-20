import { ValueObject } from '@easydev/shared-kernel';

export class AgentId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): AgentId {
    if (!value) {
      throw new Error('AgentId cannot be empty');
    }
    return new AgentId({ value });
  }
}

export class WorkflowExecutionId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WorkflowExecutionId {
    if (!value) {
      throw new Error('WorkflowExecutionId cannot be empty');
    }
    return new WorkflowExecutionId({ value });
  }
}

export class SessionId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): SessionId {
    if (!value) {
      throw new Error('SessionId cannot be empty');
    }
    return new SessionId({ value });
  }
}

export class ConfidenceScore extends ValueObject<{ value: number }> {
  private constructor(props: { value: number }) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): ConfidenceScore {
    if (value < 0 || value > 1) {
      throw new Error('ConfidenceScore must be between 0.0 and 1.0');
    }
    return new ConfidenceScore({ value });
  }
}

export class TokenUsage extends ValueObject<{ value: number }> {
  private constructor(props: { value: number }) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): TokenUsage {
    if (value < 0) {
      throw new Error('TokenUsage cannot be negative');
    }
    return new TokenUsage({ value });
  }
}

export class CostValue extends ValueObject<{ value: number }> {
  private constructor(props: { value: number }) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): CostValue {
    if (value < 0) {
      throw new Error('CostValue cannot be negative');
    }
    return new CostValue({ value });
  }
}

export enum AgentTypeEnum {
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  SALES = 'SALES',
  RETENTION = 'RETENTION',
  BILLING = 'BILLING',
  TECHNICAL = 'TECHNICAL',
  ONBOARDING = 'ONBOARDING',
  CUSTOM = 'CUSTOM',
}

export enum AgentStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum SessionStateEnum {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum WorkflowStatusEnum {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  RETRYING = 'RETRYING',
}

export enum ToolStatusEnum {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum EscalationStatusEnum {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}

export enum EscalationTargetEnum {
  AGENT = 'AGENT',
  TEAM = 'TEAM',
  MANAGER = 'MANAGER',
}

export enum ResponseTypeEnum {
  AUTOMATED = 'AUTOMATED',
  CO_PILOT = 'CO_PILOT',
  SUGGESTION = 'SUGGESTION',
}
