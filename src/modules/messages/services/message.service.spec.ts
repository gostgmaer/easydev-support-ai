import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessageService } from './message.service';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { ConversationService } from '../../conversations/services/conversation.service';
import { AuditService } from '../../audit/audit.service';
import { WidgetSessionService } from '../../widget/services/widget-session.service';
import { WidgetRealtimeService } from '../../widget/services/widget-realtime.service';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { Message } from '../domain/message.aggregate';
import {
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
} from '../domain/value-objects';
import { CreateMessageDto } from '../dtos';

function buildMessage(tenantId: string, id: string): Message {
  return Message.create(id, {
    tenantId,
    conversationId: randomUUID(),
    channelId: randomUUID(),
    customerId: randomUUID(),
    senderType: 'AGENT',
    messageType: MessageType.create(MessageTypeEnum.TEXT),
    direction: MessageDirection.create(MessageDirectionEnum.OUTBOUND),
    content: 'hi',
    status: MessageStatus.create(MessageStatusEnum.QUEUED),
  });
}

describe('MessageService', () => {
  let service: MessageService;
  let repo: any;
  let readModel: any;
  let conversations: any;
  let audit: any;

  const tenantId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    save: jest.fn((m) => Promise.resolve(m)),
    delete: jest.fn().mockResolvedValue(true),
    findPaginated: jest.fn(),
    findByConversation: jest.fn(),
    findThread: jest.fn(),
    removeReaction: jest.fn(),
    bulkUpdateStatus: jest.fn().mockResolvedValue(3),
  };
  const mockPublisher = { publish: jest.fn(), publishAll: jest.fn() };
  const mockReadModel = { applyMessage: jest.fn(), refresh: jest.fn() };
  const mockConversations = {
    findById: jest.fn().mockResolvedValue({
      id: randomUUID(),
      channelId: randomUUID(),
      customerId: randomUUID(),
    }),
  };
  const mockAudit = { log: jest.fn() };
  const mockWidgetSessionService = {
    findSessionIdsByConversation: jest.fn().mockResolvedValue([]),
  };
  const mockWidgetRealtimeService = { sendNewMessage: jest.fn() };
  const mockWorkflowEngineService = { evaluateEventTriggers: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: 'IMessageRepository', useValue: mockRepo },
        { provide: MessageEventPublisher, useValue: mockPublisher },
        { provide: MessageReadModelService, useValue: mockReadModel },
        { provide: ConversationService, useValue: mockConversations },
        { provide: AuditService, useValue: mockAudit },
        { provide: WidgetSessionService, useValue: mockWidgetSessionService },
        { provide: WidgetRealtimeService, useValue: mockWidgetRealtimeService },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngineService },
      ],
    }).compile();

    service = module.get(MessageService);
    repo = module.get('IMessageRepository');
    readModel = module.get(MessageReadModelService);
    conversations = module.get(ConversationService);
    audit = module.get(AuditService);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((m: any) => Promise.resolve(m));
    mockConversations.findById.mockResolvedValue({
      id: randomUUID(),
      channelId: randomUUID(),
      customerId: randomUUID(),
    });
  });

  describe('create', () => {
    const dto: CreateMessageDto = {
      conversationId: randomUUID(),
      senderType: 'AGENT',
      content: 'hello',
    };

    it('validates the conversation, persists, projects read model and audits', async () => {
      const result = await service.create(tenantId, dto, 'user-1');

      expect(conversations.findById).toHaveBeenCalledWith(
        tenantId,
        dto.conversationId,
      );
      expect(repo.save).toHaveBeenCalled();
      expect(readModel.applyMessage).toHaveBeenCalled();
      expect(result.direction.value).toBe(MessageDirectionEnum.OUTBOUND);
      expect(result.status.value).toBe(MessageStatusEnum.QUEUED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MESSAGE_CREATE' }),
      );
    });

    it('starts inbound messages as DELIVERED', async () => {
      const result = await service.create(tenantId, {
        ...dto,
        direction: MessageDirectionEnum.INBOUND,
        senderType: 'CUSTOMER',
      });
      expect(result.status.value).toBe(MessageStatusEnum.DELIVERED);
    });
  });

  describe('reply', () => {
    it('threads the reply onto the parent message', async () => {
      const parentId = randomUUID();
      const parent = buildMessage(tenantId, parentId);
      parent.clearEvents();
      mockRepo.findById.mockResolvedValue(parent);

      const result = await service.reply(
        tenantId,
        parentId,
        { content: 'reply', senderType: 'AGENT' },
        'user-1',
      );

      expect(result.threadId).toBe(parentId);
      expect(result.replyToMessageId).toBe(parentId);
    });
  });

  describe('lifecycle', () => {
    let message: Message;
    const id = randomUUID();

    beforeEach(() => {
      message = buildMessage(tenantId, id);
      message.clearEvents();
      mockRepo.findById.mockResolvedValue(message);
    });

    it('marks a message read', async () => {
      const result = await service.markRead(tenantId, id, 'agent-1');
      expect(result.status.value).toBe(MessageStatusEnum.READ);
    });

    it('archives a message', async () => {
      const result = await service.archive(tenantId, id, 'agent-1');
      expect(result.status.value).toBe(MessageStatusEnum.ARCHIVED);
    });

    it('adds a reaction', async () => {
      const result = await service.react(tenantId, id, randomUUID(), '🎉');
      expect(result.reactions).toHaveLength(1);
    });

    it('soft deletes and refreshes the read model', async () => {
      const ok = await service.delete(tenantId, id, 'agent-1');
      expect(ok).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith(id, tenantId);
      expect(readModel.refresh).toHaveBeenCalledWith(
        tenantId,
        message.conversationId,
      );
    });

    it('throws NotFound when the message is missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.markRead(tenantId, id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulk', () => {
    it('bulk updates status and audits', async () => {
      const result = await service.bulkUpdateStatus(
        tenantId,
        [randomUUID(), randomUUID()],
        MessageStatusEnum.ARCHIVED,
        'user-1',
      );
      expect(result.updated).toBe(3);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MESSAGE_BULK_UPDATE' }),
      );
    });
  });
});
