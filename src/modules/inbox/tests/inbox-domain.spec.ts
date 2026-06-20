import { randomUUID } from 'crypto';
import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxSnooze } from '../domain/inbox-snooze.entity';
import { InboxPresence } from '../domain/inbox-presence.entity';
import {
  InboxStatus,
  InboxStatusEnum,
  InboxPriorityEnum,
  PresenceStatus,
  PresenceStatusEnum,
  AssignmentType,
  AssignmentTypeEnum,
} from '../domain/value-objects';

function buildView(tenantId: string, conversationId: string): InboxView {
  const v = InboxView.create(randomUUID(), {
    tenantId,
    conversationId,
    status: InboxStatus.create(InboxStatusEnum.OPEN),
    priority: InboxPriorityEnum.MEDIUM,
  });
  v.clearEvents();
  return v;
}

describe('InboxView aggregate', () => {
  const tenantId = randomUUID();
  const conversationId = randomUUID();

  it('emits an inbox.updated event on creation', () => {
    const view = InboxView.create(randomUUID(), {
      tenantId,
      conversationId,
      status: InboxStatus.create(InboxStatusEnum.OPEN),
      priority: InboxPriorityEnum.MEDIUM,
    });
    expect(view.domainEvents).toHaveLength(1);
    expect(
      (view.domainEvents[0].constructor as { eventName?: string }).eventName,
    ).toBe('inbox.updated');
  });

  it('increments unread and sets waitingSince on an inbound message', () => {
    const view = buildView(tenantId, conversationId);
    view.applyMessage({
      content: 'hi',
      type: 'TEXT',
      direction: 'INBOUND',
    });
    expect(view.unreadCount).toBe(1);
    expect(view.waitingSince).toBeInstanceOf(Date);
    expect(view.lastMessage).toBe('hi');
  });

  it('resets unread and clears waiting on an outbound message', () => {
    const view = buildView(tenantId, conversationId);
    view.applyMessage({ content: 'q', direction: 'INBOUND' });
    view.applyMessage({ content: 'a', direction: 'OUTBOUND' });
    expect(view.unreadCount).toBe(0);
    expect(view.waitingSince).toBeUndefined();
  });

  it('assigns and unassigns an agent', () => {
    const view = buildView(tenantId, conversationId);
    const agentId = randomUUID();
    view.assign(agentId, undefined);
    expect(view.assignedAgentId).toBe(agentId);
    view.unassign();
    expect(view.assignedAgentId).toBeUndefined();
  });

  it('transitions through snooze, resolve and archive', () => {
    const view = buildView(tenantId, conversationId);
    view.snooze();
    expect(view.status.value).toBe(InboxStatusEnum.SNOOZED);
    view.unsnooze();
    expect(view.status.value).toBe(InboxStatusEnum.OPEN);
    view.resolve();
    expect(view.status.value).toBe(InboxStatusEnum.RESOLVED);
    view.archive();
    expect(view.status.value).toBe(InboxStatusEnum.ARCHIVED);
    expect(view.status.isTerminal()).toBe(true);
  });

  it('stores SLA-risk and AI-escalation flags in metadata', () => {
    const view = buildView(tenantId, conversationId);
    view.setMetadata({ slaRisk: true, aiEscalated: true });
    expect(view.metadata?.slaRisk).toBe(true);
    expect(view.metadata?.aiEscalated).toBe(true);
  });
});

describe('inbox value objects', () => {
  it('rejects an invalid presence status', () => {
    expect(() => PresenceStatus.create('NOPE' as PresenceStatusEnum)).toThrow();
  });

  it('reports availability for ONLINE presence', () => {
    expect(
      PresenceStatus.create(PresenceStatusEnum.ONLINE).isAvailable(),
    ).toBe(true);
    expect(
      PresenceStatus.create(PresenceStatusEnum.AWAY).isAvailable(),
    ).toBe(false);
  });

  it('validates assignment types', () => {
    expect(
      AssignmentType.create(AssignmentTypeEnum.ROUND_ROBIN).value,
    ).toBe('ROUND_ROBIN');
    expect(() =>
      AssignmentType.create('BOGUS' as AssignmentTypeEnum),
    ).toThrow();
  });
});

describe('InboxSnooze entity', () => {
  it('detects when a snooze is due', () => {
    const past = new InboxSnooze(randomUUID(), {
      tenantId: randomUUID(),
      conversationId: randomUUID(),
      snoozedUntil: new Date(Date.now() - 1000),
    });
    const future = new InboxSnooze(randomUUID(), {
      tenantId: randomUUID(),
      conversationId: randomUUID(),
      snoozedUntil: new Date(Date.now() + 60000),
    });
    expect(past.isDue()).toBe(true);
    expect(future.isDue()).toBe(false);
  });
});

describe('InboxPresence entity', () => {
  it('updates status and active conversation', () => {
    const presence = new InboxPresence(randomUUID(), {
      tenantId: randomUUID(),
      userId: randomUUID(),
      status: PresenceStatus.create(PresenceStatusEnum.OFFLINE),
    });
    const convId = randomUUID();
    presence.updateStatus(PresenceStatusEnum.ONLINE, convId);
    expect(presence.status.value).toBe('ONLINE');
    expect(presence.activeConversationId).toBe(convId);
  });
});
