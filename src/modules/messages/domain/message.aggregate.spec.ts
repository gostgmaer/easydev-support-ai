import { randomUUID } from 'crypto';
import { Message } from './message.aggregate';
import { MessageReaction } from './message-reaction.entity';
import { MessageMention } from './message-mention.entity';
import {
  MessageId,
  MessageContent,
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
  ExternalMessageId,
} from './value-objects';

function build(direction = MessageDirectionEnum.OUTBOUND): Message {
  return Message.create(randomUUID(), {
    tenantId: randomUUID(),
    conversationId: randomUUID(),
    channelId: randomUUID(),
    customerId: randomUUID(),
    senderType: direction === MessageDirectionEnum.INBOUND ? 'CUSTOMER' : 'AGENT',
    messageType: MessageType.create(MessageTypeEnum.TEXT),
    direction: MessageDirection.create(direction),
    content: 'hello world',
    status: MessageStatus.create(MessageStatusEnum.QUEUED),
  });
}

describe('Message value objects', () => {
  it('rejects an invalid MessageId', () => {
    expect(() => MessageId.create('nope')).toThrow();
  });

  it('rejects invalid message type/direction/status', () => {
    expect(() => MessageType.create('BOGUS' as MessageTypeEnum)).toThrow();
    expect(() =>
      MessageDirection.create('SIDEWAYS' as MessageDirectionEnum),
    ).toThrow();
    expect(() => MessageStatus.create('NOPE' as MessageStatusEnum)).toThrow();
  });

  it('classifies media types and internal notes', () => {
    expect(MessageType.create(MessageTypeEnum.IMAGE).isMedia()).toBe(true);
    expect(MessageType.create(MessageTypeEnum.TEXT).isMedia()).toBe(false);
    expect(
      MessageType.create(MessageTypeEnum.INTERNAL_NOTE).isInternal(),
    ).toBe(true);
  });

  it('exposes retryable + terminal status semantics', () => {
    expect(MessageStatus.create(MessageStatusEnum.FAILED).canRetry()).toBe(true);
    expect(MessageStatus.create(MessageStatusEnum.READ).isTerminal()).toBe(true);
    expect(MessageStatus.create(MessageStatusEnum.SENT).canRetry()).toBe(false);
  });

  it('normalizes external message id and content bounds', () => {
    expect(ExternalMessageId.create('  ext-1 ').value).toBe('ext-1');
    expect(MessageContent.create('').isEmpty).toBe(true);
  });
});

describe('Message aggregate', () => {
  it('emits created event for outbound messages', () => {
    const m = build();
    const names = m.domainEvents.map(
      (e) => (e.constructor as any).eventName,
    );
    expect(names).toContain('message.created');
    expect(names).not.toContain('message.received');
  });

  it('emits created + received events for inbound messages', () => {
    const m = build(MessageDirectionEnum.INBOUND);
    const names = m.domainEvents.map(
      (e) => (e.constructor as any).eventName,
    );
    expect(names).toContain('message.created');
    expect(names).toContain('message.received');
  });

  it('transitions through the delivery lifecycle', () => {
    const m = build();
    m.clearEvents();

    m.markSent('ext-123');
    expect(m.status.value).toBe(MessageStatusEnum.SENT);
    expect(m.externalMessageId).toBe('ext-123');
    expect(m.sentAt).toBeInstanceOf(Date);

    m.markDelivered('whatsapp');
    expect(m.status.value).toBe(MessageStatusEnum.DELIVERED);
    expect(m.deliveredAt).toBeInstanceOf(Date);

    m.markRead('agent-1');
    expect(m.status.value).toBe(MessageStatusEnum.READ);
    expect(m.readAt).toBeInstanceOf(Date);

    const emitted = m.domainEvents.map((e) => (e.constructor as any).eventName);
    expect(emitted).toEqual([
      'message.sent',
      'message.delivered',
      'message.read',
    ]);
  });

  it('deduplicates reactions per user + emoji', () => {
    const m = build();
    const userId = randomUUID();
    const mk = () =>
      new MessageReaction(randomUUID(), {
        tenantId: m.tenantId,
        messageId: m.id,
        userId,
        reaction: '👍',
      });
    m.addReaction(mk());
    m.addReaction(mk());
    expect(m.reactions).toHaveLength(1);
    m.removeReaction(userId, '👍');
    expect(m.reactions).toHaveLength(0);
  });

  it('deduplicates mentions per user', () => {
    const m = build();
    const mentionedUserId = randomUUID();
    const mk = () =>
      new MessageMention(randomUUID(), {
        tenantId: m.tenantId,
        messageId: m.id,
        mentionedUserId,
        mentionedBy: randomUUID(),
      });
    m.addMention(mk());
    m.addMention(mk());
    expect(m.mentions).toHaveLength(1);
  });

  it('serializes value objects to primitives', () => {
    const json = build().toJSON();
    expect(json.messageType).toBe('TEXT');
    expect(json.direction).toBe('OUTBOUND');
    expect(json.status).toBe('QUEUED');
  });
});
