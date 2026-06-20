import { randomUUID } from 'crypto';
import { Ticket } from './ticket.aggregate';
import { TicketTag } from './ticket-tag.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketApproval } from './ticket-approval.entity';
import {
  TicketId,
  TicketNumber,
  TicketStatus,
  TicketStatusEnum,
  TicketPriority,
  TicketPriorityEnum,
  TicketSource,
  TicketSourceEnum,
  TicketCategory,
} from './value-objects';

function build(priority = TicketPriorityEnum.MEDIUM): Ticket {
  return Ticket.create(randomUUID(), {
    tenantId: randomUUID(),
    ticketNumber: TicketNumber.generate(1),
    customerId: randomUUID(),
    priority: TicketPriority.create(priority),
    status: TicketStatus.create(TicketStatusEnum.OPEN),
    source: TicketSource.create(TicketSourceEnum.MANUAL),
    subject: 'Cannot log in',
  });
}

describe('Ticket value objects', () => {
  it('rejects an invalid TicketId', () => {
    expect(() => TicketId.create('nope')).toThrow();
  });

  it('generates a zero-padded ticket number', () => {
    expect(TicketNumber.generate(42).value).toBe('TKT-000042');
  });

  it('rejects invalid status/priority/source', () => {
    expect(() => TicketStatus.create('BOGUS' as TicketStatusEnum)).toThrow();
    expect(() => TicketPriority.create('NOPE' as TicketPriorityEnum)).toThrow();
    expect(() => TicketSource.create('FOO' as TicketSourceEnum)).toThrow();
  });

  it('escalates priority one level, capped at CRITICAL', () => {
    expect(
      TicketPriority.create(TicketPriorityEnum.MEDIUM).escalated().value,
    ).toBe(TicketPriorityEnum.HIGH);
    expect(
      TicketPriority.create(TicketPriorityEnum.CRITICAL).escalated().value,
    ).toBe(TicketPriorityEnum.CRITICAL);
  });

  it('normalizes a category name', () => {
    expect(TicketCategory.create('  Billing ').value).toBe('Billing');
  });
});

describe('Ticket aggregate', () => {
  it('emits a created event on creation', () => {
    const t = build();
    expect(t.domainEvents).toHaveLength(1);
    expect(t.domainEvents[0].getAggregateId()).toBe(t.id);
  });

  it('assigns an agent and moves to ASSIGNED', () => {
    const t = build();
    t.clearEvents();
    const agentId = randomUUID();
    t.assign(agentId, undefined, 'user-1');
    expect(t.assignedAgentId).toBe(agentId);
    expect(t.status.value).toBe(TicketStatusEnum.ASSIGNED);
  });

  it('escalates priority and emits an escalation event', () => {
    const t = build(TicketPriorityEnum.MEDIUM);
    t.clearEvents();
    t.escalate('NEGATIVE_SENTIMENT');
    expect(t.priority.value).toBe(TicketPriorityEnum.HIGH);
    expect(
      t.domainEvents.some(
        (e) => (e.constructor as any).eventName === 'ticket.escalated',
      ),
    ).toBe(true);
  });

  it('records first response when the first comment is added', () => {
    const t = build();
    t.clearEvents();
    expect(t.firstResponseAt).toBeUndefined();
    t.addComment(
      new TicketComment(randomUUID(), {
        tenantId: t.tenantId,
        ticketId: t.id,
        authorId: randomUUID(),
        comment: 'Looking into it',
        visibility: 'PUBLIC',
        attachmentsCount: 0,
      }),
    );
    expect(t.firstResponseAt).toBeInstanceOf(Date);
  });

  it('moves to APPROVAL_PENDING on approval request', () => {
    const t = build();
    t.clearEvents();
    t.requestApproval(
      new TicketApproval(randomUUID(), {
        tenantId: t.tenantId,
        ticketId: t.id,
        approverId: randomUUID(),
        status: 'PENDING',
        type: 'REFUND',
      }),
    );
    expect(t.status.value).toBe(TicketStatusEnum.APPROVAL_PENDING);
    expect(t.approvals).toHaveLength(1);
  });

  it('resolves, reopens and clears resolution timestamps', () => {
    const t = build();
    t.resolve('Fixed', 'agent-1');
    expect(t.status.value).toBe(TicketStatusEnum.RESOLVED);
    expect(t.resolvedAt).toBeInstanceOf(Date);
    t.reopen('agent-2');
    expect(t.status.value).toBe(TicketStatusEnum.REOPENED);
    expect(t.resolvedAt).toBeUndefined();
  });

  it('deduplicates tags', () => {
    const t = build();
    const mk = () =>
      new TicketTag(randomUUID(), {
        tenantId: t.tenantId,
        ticketId: t.id,
        tag: 'vip',
      });
    t.addTag(mk());
    t.addTag(mk());
    expect(t.tags).toHaveLength(1);
  });

  it('serializes value objects to primitives', () => {
    const json = build().toJSON();
    expect(json.status).toBe('OPEN');
    expect(json.priority).toBe('MEDIUM');
    expect(json.source).toBe('MANUAL');
    expect(json.ticketNumber).toBe('TKT-000001');
  });
});
