export interface IDomainEvent {
  occurredAt: Date;
  getAggregateId(): string;
}

export abstract class DomainEvent implements IDomainEvent {
  public readonly occurredAt: Date;

  constructor() {
    this.occurredAt = new Date();
  }

  abstract getAggregateId(): string;
}
