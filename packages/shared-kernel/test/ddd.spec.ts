import { Entity } from '../src/ddd/entity';
import { ValueObject } from '../src/ddd/value-object';
import { AggregateRoot } from '../src/ddd/aggregate-root';
import { DomainEvent } from '../src/ddd/domain-event';

class TestId extends Entity<string> {}

class Money extends ValueObject<{ amount: number; currency: string }> {}

class ThingCreated extends DomainEvent {
  constructor(private readonly thingId: string) {
    super();
  }
  getAggregateId(): string {
    return this.thingId;
  }
}

class Thing extends AggregateRoot<string> {
  create(): void {
    this.addDomainEvent(new ThingCreated(this.id));
  }
}

describe('Entity', () => {
  it('treats entities with the same id as equal', () => {
    const a = new TestId('abc');
    const b = new TestId('abc');
    const c = new TestId('xyz');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(undefined)).toBe(false);
  });
});

describe('ValueObject', () => {
  it('compares by structural value, not reference', () => {
    const a = new Money({ amount: 10, currency: 'USD' });
    const b = new Money({ amount: 10, currency: 'USD' });
    const c = new Money({ amount: 20, currency: 'USD' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('is immutable', () => {
    const money = new Money({ amount: 10, currency: 'USD' });
    expect(() => {
      (money as unknown as { props: { amount: number } }).props.amount = 99;
    }).toThrow();
  });
});

describe('AggregateRoot', () => {
  it('records and clears domain events', () => {
    const thing = new Thing('t-1');
    expect(thing.domainEvents).toHaveLength(0);

    thing.create();
    expect(thing.domainEvents).toHaveLength(1);
    expect(thing.domainEvents[0]).toBeInstanceOf(ThingCreated);
    expect(thing.domainEvents[0].getAggregateId()).toBe('t-1');
    expect(thing.domainEvents[0].occurredAt).toBeInstanceOf(Date);

    thing.clearEvents();
    expect(thing.domainEvents).toHaveLength(0);
  });
});
