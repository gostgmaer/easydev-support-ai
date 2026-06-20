import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessageInboundService } from './message-inbound.service';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { ConversationService } from '../../conversations/services/conversation.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';

describe('MessageInboundService', () => {
  let service: MessageInboundService;
  let repo: any;
  let conversations: any;
  let queue: any;

  const tenantId = randomUUID();
  const channelId = randomUUID();

  const mockRepo = {
    findByExternalId: jest.fn(),
    save: jest.fn((m) => Promise.resolve(m)),
  };
  const mockConversations = {
    findById: jest.fn(),
    create: jest.fn(),
  };
  const mockQueue = { addJob: jest.fn() };
  const mockPublisher = { publishAll: jest.fn() };
  const mockReadModel = { applyMessage: jest.fn() };
  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageInboundService,
        { provide: 'IMessageRepository', useValue: mockRepo },
        { provide: ConversationService, useValue: mockConversations },
        { provide: QueueService, useValue: mockQueue },
        { provide: MessageEventPublisher, useValue: mockPublisher },
        { provide: MessageReadModelService, useValue: mockReadModel },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(MessageInboundService);
    repo = module.get('IMessageRepository');
    conversations = module.get(ConversationService);
    queue = module.get(QueueService);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((m: any) => Promise.resolve(m));
  });

  it('enqueues webhooks without processing inline', async () => {
    await service.enqueueWebhook(tenantId, {
      channelId,
      customerId: randomUUID(),
      content: 'hi',
    } as any);

    expect(queue.addJob).toHaveBeenCalledWith(
      'message-queue',
      'message-inbound-job',
      expect.objectContaining({ tenantId }),
    );
  });

  it('validates that a channel is present', async () => {
    await expect(
      service.ingest(tenantId, { content: 'x' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deduplicates by external message id', async () => {
    mockRepo.findByExternalId.mockResolvedValue({ id: randomUUID() });

    const result = await service.ingest(tenantId, {
      channelId,
      conversationId: randomUUID(),
      externalMessageId: 'ext-1',
      content: 'dup',
    } as any);

    expect(result.deduplicated).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('resolves an existing conversation and persists an inbound message', async () => {
    const conversationId = randomUUID();
    mockRepo.findByExternalId.mockResolvedValue(null);
    mockConversations.findById.mockResolvedValue({ id: conversationId });

    const result = await service.ingest(tenantId, {
      channelId,
      conversationId,
      externalMessageId: 'ext-2',
      content: 'hello',
    } as any);

    expect(result.deduplicated).toBe(false);
    expect(result.message?.direction).toBe('INBOUND');
    expect(result.message?.conversationId).toBe(conversationId);
    expect(mockReadModel.applyMessage).toHaveBeenCalled();
  });

  it('creates a conversation when only a customer is provided', async () => {
    const newConversationId = randomUUID();
    mockRepo.findByExternalId.mockResolvedValue(null);
    mockConversations.create.mockResolvedValue({ id: newConversationId });

    const result = await service.ingest(tenantId, {
      channelId,
      customerId: randomUUID(),
      content: 'first contact',
    } as any);

    expect(conversations.create).toHaveBeenCalled();
    expect(result.message?.conversationId).toBe(newConversationId);
  });
});
