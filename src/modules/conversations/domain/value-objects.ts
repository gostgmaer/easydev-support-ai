import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class ConversationId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(
        `Invalid ConversationId: ${value}. Must be a valid UUID.`,
      );
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ConversationId {
    return new ConversationId(value);
  }
}

export enum ConversationStatusEnum {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_AGENT = 'WAITING_AGENT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export class ConversationStatus extends ValueObject<{
  value: ConversationStatusEnum;
}> {
  constructor(value: ConversationStatusEnum) {
    if (!Object.values(ConversationStatusEnum).includes(value)) {
      throw new Error(`Invalid conversation status: ${value}`);
    }
    super({ value });
  }

  get value(): ConversationStatusEnum {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return (
      this.props.value === ConversationStatusEnum.CLOSED ||
      this.props.value === ConversationStatusEnum.ARCHIVED
    );
  }

  public static create(value: ConversationStatusEnum): ConversationStatus {
    return new ConversationStatus(value);
  }
}

export enum ConversationPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

const PRIORITY_WEIGHTS: Record<ConversationPriorityEnum, number> = {
  [ConversationPriorityEnum.LOW]: 1,
  [ConversationPriorityEnum.MEDIUM]: 2,
  [ConversationPriorityEnum.HIGH]: 3,
  [ConversationPriorityEnum.URGENT]: 4,
  [ConversationPriorityEnum.CRITICAL]: 5,
};

export class ConversationPriority extends ValueObject<{
  value: ConversationPriorityEnum;
}> {
  constructor(value: ConversationPriorityEnum) {
    if (!Object.values(ConversationPriorityEnum).includes(value)) {
      throw new Error(`Invalid conversation priority: ${value}`);
    }
    super({ value });
  }

  get value(): ConversationPriorityEnum {
    return this.props.value;
  }

  get weight(): number {
    return PRIORITY_WEIGHTS[this.props.value];
  }

  public static create(value: ConversationPriorityEnum): ConversationPriority {
    return new ConversationPriority(value);
  }
}

export class ConversationLanguage extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim().toLowerCase();
    if (!cleaned || cleaned.length > 10) {
      throw new Error(`Invalid language code: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ConversationLanguage {
    return new ConversationLanguage(value);
  }
}

export enum ConversationSentimentEnum {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

export class ConversationSentiment extends ValueObject<{
  value: ConversationSentimentEnum;
}> {
  constructor(value: ConversationSentimentEnum) {
    if (!Object.values(ConversationSentimentEnum).includes(value)) {
      throw new Error(`Invalid conversation sentiment: ${value}`);
    }
    super({ value });
  }

  get value(): ConversationSentimentEnum {
    return this.props.value;
  }

  public static create(
    value: ConversationSentimentEnum,
  ): ConversationSentiment {
    return new ConversationSentiment(value);
  }
}

export class ConversationSource extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim().toUpperCase();
    if (!cleaned || cleaned.length > 50) {
      throw new Error(`Invalid conversation source: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ConversationSource {
    return new ConversationSource(value);
  }
}
