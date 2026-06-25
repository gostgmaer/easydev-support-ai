export interface IDomainEvent {
  occurredAt: Date;
  getAggregateId(): string;
}
export declare abstract class DomainEvent implements IDomainEvent {
  readonly occurredAt: Date;
  constructor();
  abstract getAggregateId(): string;
}
