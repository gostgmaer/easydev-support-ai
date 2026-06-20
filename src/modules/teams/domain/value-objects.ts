import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class TeamId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid TeamId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): TeamId {
    return new TeamId(value);
  }
}

export class AgentId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid AgentId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): AgentId {
    return new AgentId(value);
  }
}

export enum AssignmentStrategyEnum {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_LOADED = 'LEAST_LOADED',
  SKILL_BASED = 'SKILL_BASED',
  PRIORITY_BASED = 'PRIORITY_BASED',
  MANUAL = 'MANUAL'
}

export class AssignmentStrategy extends ValueObject<{ value: AssignmentStrategyEnum }> {
  constructor(value: AssignmentStrategyEnum) {
    if (!Object.values(AssignmentStrategyEnum).includes(value)) {
      throw new Error(`Invalid assignment strategy: ${value}`);
    }
    super({ value });
  }

  get value(): AssignmentStrategyEnum {
    return this.props.value;
  }

  public static create(value: AssignmentStrategyEnum): AssignmentStrategy {
    return new AssignmentStrategy(value);
  }
}

export class Department extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > 100) {
      throw new Error(`Invalid department name: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Department {
    return new Department(value);
  }
}

export interface AgentCapacityProps {
  capacity: number;
  maxConcurrentConversations: number;
  maxOpenTickets: number;
}

export class AgentCapacity extends ValueObject<AgentCapacityProps> {
  constructor(props: AgentCapacityProps) {
    if (props.capacity < 0 || props.maxConcurrentConversations < 0 || props.maxOpenTickets < 0) {
      throw new Error('Agent capacity metrics cannot be negative');
    }
    super(props);
  }

  get capacity(): number { return this.props.capacity; }
  get maxConcurrentConversations(): number { return this.props.maxConcurrentConversations; }
  get maxOpenTickets(): number { return this.props.maxOpenTickets; }

  public static create(props: AgentCapacityProps): AgentCapacity {
    return new AgentCapacity(props);
  }
}
