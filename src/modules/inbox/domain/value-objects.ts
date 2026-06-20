import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class InboxViewId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid InboxViewId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): InboxViewId {
    return new InboxViewId(value);
  }
}

export class FilterId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid FilterId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): FilterId {
    return new FilterId(value);
  }
}

export class SavedViewId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid SavedViewId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): SavedViewId {
    return new SavedViewId(value);
  }
}

export enum InboxStatusEnum {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_AGENT = 'WAITING_AGENT',
  SNOOZED = 'SNOOZED',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
}

export class InboxStatus extends ValueObject<{ value: InboxStatusEnum }> {
  constructor(value: InboxStatusEnum) {
    if (!Object.values(InboxStatusEnum).includes(value)) {
      throw new Error(`Invalid InboxStatus: ${value}`);
    }
    super({ value });
  }

  get value(): InboxStatusEnum {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return (
      this.props.value === InboxStatusEnum.RESOLVED ||
      this.props.value === InboxStatusEnum.ARCHIVED
    );
  }

  public static create(value: InboxStatusEnum): InboxStatus {
    return new InboxStatus(value);
  }
}

export enum InboxPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SentimentEnum {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

export enum PresenceStatusEnum {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export class PresenceStatus extends ValueObject<{ value: PresenceStatusEnum }> {
  constructor(value: PresenceStatusEnum) {
    if (!Object.values(PresenceStatusEnum).includes(value)) {
      throw new Error(`Invalid PresenceStatus: ${value}`);
    }
    super({ value });
  }

  get value(): PresenceStatusEnum {
    return this.props.value;
  }

  public isAvailable(): boolean {
    return this.props.value === PresenceStatusEnum.ONLINE;
  }

  public static create(value: PresenceStatusEnum): PresenceStatus {
    return new PresenceStatus(value);
  }
}

export enum AssignmentTypeEnum {
  MANUAL = 'MANUAL',
  ROUND_ROBIN = 'ROUND_ROBIN',
  TEAM = 'TEAM',
  FORCE = 'FORCE',
  TRANSFER = 'TRANSFER',
  AUTO = 'AUTO',
  UNASSIGN = 'UNASSIGN',
}

export class AssignmentType extends ValueObject<{ value: AssignmentTypeEnum }> {
  constructor(value: AssignmentTypeEnum) {
    if (!Object.values(AssignmentTypeEnum).includes(value)) {
      throw new Error(`Invalid AssignmentType: ${value}`);
    }
    super({ value });
  }

  get value(): AssignmentTypeEnum {
    return this.props.value;
  }

  public static create(value: AssignmentTypeEnum): AssignmentType {
    return new AssignmentType(value);
  }
}
