import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class TicketId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid TicketId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): TicketId {
    return new TicketId(value);
  }
}

export class TicketNumber extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim().toUpperCase();
    if (!cleaned || cleaned.length > 50) {
      throw new Error(`Invalid ticket number: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): TicketNumber {
    return new TicketNumber(value);
  }

  /**
   * Builds a human-friendly, tenant-unique ticket number.
   */
  public static generate(sequence: number, prefix = 'TKT'): TicketNumber {
    const padded = String(sequence).padStart(6, '0');
    return new TicketNumber(`${prefix}-${padded}`);
  }
}

export enum TicketStatusEnum {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_INTERNAL = 'WAITING_INTERNAL',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  CANCELLED = 'CANCELLED',
}

const TERMINAL_STATUSES = new Set<TicketStatusEnum>([
  TicketStatusEnum.CLOSED,
  TicketStatusEnum.CANCELLED,
]);

/**
 * Thrown when a caller (HTTP PUT, workflow action, etc.) tries to move a
 * ticket to a status that doesn't make sense from its current one - e.g.
 * closing an already-closed ticket, or reopening one that's still active.
 */
export class InvalidTicketTransitionError extends Error {
  constructor(from: TicketStatusEnum, to: TicketStatusEnum) {
    super(`Cannot transition ticket from ${from} to ${to}`);
    this.name = 'InvalidTicketTransitionError';
  }
}

export class TicketStatus extends ValueObject<{ value: TicketStatusEnum }> {
  constructor(value: TicketStatusEnum) {
    if (!Object.values(TicketStatusEnum).includes(value)) {
      throw new Error(`Invalid ticket status: ${value}`);
    }
    super({ value });
  }

  get value(): TicketStatusEnum {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this.props.value);
  }

  public isResolved(): boolean {
    return this.props.value === TicketStatusEnum.RESOLVED;
  }

  /**
   * The only way out of CLOSED/CANCELLED is an explicit reopen - including
   * re-closing/re-cancelling an already-terminal ticket, which must be
   * rejected rather than silently re-applied. Reopening only makes sense
   * for a ticket that was actually resolved or terminal in the first place.
   * Everything else (assignment, working, waiting, approval, re-resolving)
   * stays freely interchangeable since the business never specified a
   * stricter day-to-day workflow.
   */
  public canTransitionTo(next: TicketStatusEnum): boolean {
    if (this.isTerminal()) return next === TicketStatusEnum.REOPENED;
    if (next === TicketStatusEnum.REOPENED) {
      return this.props.value === TicketStatusEnum.RESOLVED;
    }
    return true;
  }

  public assertCanTransitionTo(next: TicketStatusEnum): void {
    if (!this.canTransitionTo(next)) {
      throw new InvalidTicketTransitionError(this.props.value, next);
    }
  }

  public static create(value: TicketStatusEnum): TicketStatus {
    return new TicketStatus(value);
  }
}

export enum TicketPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

const PRIORITY_WEIGHTS: Record<TicketPriorityEnum, number> = {
  [TicketPriorityEnum.LOW]: 1,
  [TicketPriorityEnum.MEDIUM]: 2,
  [TicketPriorityEnum.HIGH]: 3,
  [TicketPriorityEnum.URGENT]: 4,
  [TicketPriorityEnum.CRITICAL]: 5,
};

const PRIORITY_ORDER: TicketPriorityEnum[] = [
  TicketPriorityEnum.LOW,
  TicketPriorityEnum.MEDIUM,
  TicketPriorityEnum.HIGH,
  TicketPriorityEnum.URGENT,
  TicketPriorityEnum.CRITICAL,
];

export class TicketPriority extends ValueObject<{ value: TicketPriorityEnum }> {
  constructor(value: TicketPriorityEnum) {
    if (!Object.values(TicketPriorityEnum).includes(value)) {
      throw new Error(`Invalid ticket priority: ${value}`);
    }
    super({ value });
  }

  get value(): TicketPriorityEnum {
    return this.props.value;
  }

  get weight(): number {
    return PRIORITY_WEIGHTS[this.props.value];
  }

  /**
   * Returns the next priority level (capped at CRITICAL) for escalations.
   */
  public escalated(): TicketPriority {
    const idx = PRIORITY_ORDER.indexOf(this.props.value);
    const next = PRIORITY_ORDER[Math.min(idx + 1, PRIORITY_ORDER.length - 1)];
    return new TicketPriority(next);
  }

  public static create(value: TicketPriorityEnum): TicketPriority {
    return new TicketPriority(value);
  }
}

export enum TicketSourceEnum {
  MANUAL = 'MANUAL',
  CONVERSATION = 'CONVERSATION',
  AI_ESCALATION = 'AI_ESCALATION',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  WEBCHAT = 'WEBCHAT',
  API = 'API',
  WORKFLOW = 'WORKFLOW',
}

export class TicketSource extends ValueObject<{ value: TicketSourceEnum }> {
  constructor(value: TicketSourceEnum) {
    if (!Object.values(TicketSourceEnum).includes(value)) {
      throw new Error(`Invalid ticket source: ${value}`);
    }
    super({ value });
  }

  get value(): TicketSourceEnum {
    return this.props.value;
  }

  public static create(value: TicketSourceEnum): TicketSource {
    return new TicketSource(value);
  }
}

export class TicketCategory extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > 255) {
      throw new Error(`Invalid ticket category: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): TicketCategory {
    return new TicketCategory(value);
  }
}
