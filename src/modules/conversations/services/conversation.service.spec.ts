import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConversationService } from './conversation.service';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { ConversationSummaryService } from './conversation-summary.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AuditService } from '../../audit/audit.service';
import { Conversation } from '../domain/conversation.aggregate';
import {
  ConversationStatus,
  ConversationStatusEnum,
  ConversationPriority,
  ConversationPriorityEnum,
  ConversationLanguage,
  ConversationSentiment,
  ConversationSentimentEnum,
  ConversationSource,
} from '../domain/value-objects';
import { CreateConversationDto } from '../dtos';

function buildConversation(tenantId: string, id: string): Conversation {
  return Conversation.create(id, {
    tenantId,
    customerId: randomUUID(),
    channelId: randomUUID(),
    status: ConversationStatus.create(ConversationStatusEnum.OPEN),
    priority: ConversationPriority.create(ConversationPriorityEnum.MEDIUM),
    language: ConversationLanguage.create('en'),
    sentiment: ConversationSentiment.create(ConversationSentimentEnum.NEUTRAL),
    source: ConversationSource.create('API'),
  });
}

describe('ConversationService', () => {
  let service: ConversationService;
  let repo: any;
  let publisher: any;
  let summary: any;
  let customers: any;
  let audit: any;

  const tenantId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    save: jest.fn((c) => Promise.resolve(c)),
    delete: jest.fn().mockResolvedValue(true),
    findPaginated: jest.fn(),
  };
  const mockPublisher = { publish: jest.fn(), publishAll: jest.fn() };
  const mockSummary = { rebuild: jest.fn(), getSummary: jest.fn() };
  const mockCustomers = {
    findById: jest.fn().mockResolvedValue({ id: 'cust' }),
  };
  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: 'IConversationRepository', useValue: mockRepo },
        { provide: ConversationEventPublisher, useValue: mockPublisher },
        { provide: ConversationSummaryService, useValue: mockSummary },
        { provide: CustomerService, useValue: mockCustomers },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(ConversationService);
    repo = module.get('IConversationRepository');
    publisher = module.get(ConversationEventPublisher);
    summary = module.get(ConversationSummaryService);
    customers = module.get(CustomerService);
    audit = module.get(AuditService);
    jest.clearAllMocks();
    mockCustomers.findById.mockResolvedValue({ id: 'cust' });
    mockRepo.save.mockImplementation((c: any) => Promise.resolve(c));
  });

  describe('create', () => {
    const dto: CreateConversationDto = {
      customerId: randomUUID(),
      channelId: randomUUID(),
    };

    it('validates the customer, persists, rebuilds summary and audits', async () => {
      const result = await service.create(tenantId, dto, 'user-1');

      expect(customers.findById).toHaveBeenCalledWith(tenantId, dto.customerId);
      expect(result.status.value).toBe(ConversationStatusEnum.OPEN);
      expect(repo.save).toHaveBeenCalled();
      expect(summary.rebuild).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CONVERSATION_CREATE' }),
      );
    });

    it('starts ASSIGNED when an agent is provided', async () => {
      const result = await service.create(tenantId, {
        ...dto,
        assignedAgentId: randomUUID(),
      });
      expect(result.status.value).toBe(ConversationStatusEnum.ASSIGNED);
    });

    it('adds the customer as a participant', async () => {
      const result = await service.create(tenantId, dto);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].participantType).toBe('CUSTOMER');
    });
  });

  describe('lifecycle', () => {
    let conversation: Conversation;
    const id = randomUUID();

    beforeEach(() => {
      conversation = buildConversation(tenantId, id);
      conversation.clearEvents();
      mockRepo.findById.mockResolvedValue(conversation);
    });

    it('resolves a conversation', async () => {
      const result = await service.resolve(tenantId, id, 'agent-1');
      expect(result.status.value).toBe(ConversationStatusEnum.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CONVERSATION_RESOLVE' }),
      );
    });

    it('closes a conversation', async () => {
      const result = await service.close(tenantId, id, 'done', 'agent-1');
      expect(result.status.value).toBe(ConversationStatusEnum.CLOSED);
      expect(result.closedAt).toBeInstanceOf(Date);
    });

    it('archives a conversation', async () => {
      const result = await service.archive(tenantId, id);
      expect(result.status.value).toBe(ConversationStatusEnum.ARCHIVED);
    });

    it('soft deletes a conversation', async () => {
      const deleted = await service.delete(tenantId, id, 'agent-1');
      expect(deleted).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith(id, tenantId);
    });

    it('throws NotFound when the conversation is missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.resolve(tenantId, id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('merge', () => {
    it('archives the source and links it into the target', async () => {
      const sourceId = randomUUID();
      const targetId = randomUUID();
      const source = buildConversation(tenantId, sourceId);
      const target = buildConversation(tenantId, targetId);
      source.clearEvents();
      target.clearEvents();
      mockRepo.findById.mockImplementation((id: string) =>
        Promise.resolve(
          id === sourceId ? source : id === targetId ? target : null,
        ),
      );

      const result = await service.merge(
        tenantId,
        sourceId,
        targetId,
        'agent-1',
      );

      expect(result.id).toBe(targetId);
      expect(source.status.value).toBe(ConversationStatusEnum.ARCHIVED);
      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CONVERSATION_MERGE' }),
      );
    });
  });
});
