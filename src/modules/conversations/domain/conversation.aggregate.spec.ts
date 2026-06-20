import { randomUUID } from 'crypto';
import { Conversation } from './conversation.aggregate';
import { ConversationTag } from './conversation-tag.entity';
import {
  ConversationStatus,
  ConversationStatusEnum,
  ConversationPriority,
  ConversationPriorityEnum,
  ConversationLanguage,
  ConversationSentiment,
  ConversationSentimentEnum,
  ConversationSource,
  ConversationId,
} from './value-objects';

function build(): Conversation {
  const tenantId = randomUUID();
  return Conversation.create(randomUUID(), {
    tenantId,
    customerId: randomUUID(),
    status: ConversationStatus.create(ConversationStatusEnum.OPEN),
    priority: ConversationPriority.create(ConversationPriorityEnum.MEDIUM),
    language: ConversationLanguage.create('EN'),
    sentiment: ConversationSentiment.create(ConversationSentimentEnum.NEUTRAL),
    source: ConversationSource.create('api'),
  });
}

describe('Conversation value objects', () => {
  it('rejects an invalid ConversationId', () => {
    expect(() => ConversationId.create('not-a-uuid')).toThrow();
  });

  it('normalizes language and source casing', () => {
    expect(ConversationLanguage.create('EN').value).toBe('en');
    expect(ConversationSource.create('widget').value).toBe('WIDGET');
  });

  it('exposes priority weights for ordering', () => {
    expect(
      ConversationPriority.create(ConversationPriorityEnum.CRITICAL).weight,
    ).toBeGreaterThan(
      ConversationPriority.create(ConversationPriorityEnum.LOW).weight,
    );
  });

  it('rejects invalid status values', () => {
    expect(() =>
      ConversationStatus.create('BOGUS' as ConversationStatusEnum),
    ).toThrow();
  });
});

describe('Conversation aggregate', () => {
  it('emits a created event on creation', () => {
    const c = build();
    expect(c.domainEvents).toHaveLength(1);
    expect(c.domainEvents[0].getAggregateId()).toBe(c.id);
  });

  it('assigns an agent and moves to ASSIGNED', () => {
    const c = build();
    c.clearEvents();
    const agentId = randomUUID();
    c.assignAgent(agentId, undefined, 'user-1');
    expect(c.assignedAgentId).toBe(agentId);
    expect(c.status.value).toBe(ConversationStatusEnum.ASSIGNED);
    expect(c.domainEvents.some((e) => e.getAggregateId() === c.id)).toBe(true);
  });

  it('transfers from one agent to another', () => {
    const c = build();
    c.assignAgent(randomUUID(), undefined);
    c.clearEvents();
    const next = randomUUID();
    c.transfer(next);
    expect(c.assignedAgentId).toBe(next);
  });

  it('deduplicates tags', () => {
    const c = build();
    const mk = () =>
      new ConversationTag(randomUUID(), {
        tenantId: c.tenantId,
        conversationId: c.id,
        tag: 'vip',
        isSystemTag: false,
      });
    c.addTag(mk());
    c.addTag(mk());
    expect(c.tags).toHaveLength(1);
  });

  it('marks first response only once', () => {
    const c = build();
    c.markFirstResponse();
    const first = c.firstResponseAt;
    c.markFirstResponse();
    expect(c.firstResponseAt).toBe(first);
  });

  it('serializes to JSON with value-object primitives', () => {
    const json = build().toJSON();
    expect(json.status).toBe('OPEN');
    expect(json.priority).toBe('MEDIUM');
    expect(json.language).toBe('en');
  });
});
