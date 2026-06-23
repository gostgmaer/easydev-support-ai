import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConversationAssignmentService } from './conversation-assignment.service';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { ConversationSummaryService } from './conversation-summary.service';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';
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

function buildConversation(tenantId: string, id: string): Conversation {
  const c = Conversation.create(id, {
    tenantId,
    customerId: randomUUID(),
    status: ConversationStatus.create(ConversationStatusEnum.OPEN),
    priority: ConversationPriority.create(ConversationPriorityEnum.HIGH),
    language: ConversationLanguage.create('en'),
    sentiment: ConversationSentiment.create(ConversationSentimentEnum.NEUTRAL),
    source: ConversationSource.create('API'),
  });
  c.clearEvents();
  return c;
}

describe('ConversationAssignmentService', () => {
  let service: ConversationAssignmentService;
  let repo: any;
  let engine: any;
  let audit: any;

  const tenantId = randomUUID();
  const conversationId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    save: jest.fn((c) => Promise.resolve(c)),
    addAssignment: jest.fn(),
    findAssignments: jest.fn(),
  };
  const mockEngine = { assignEntity: jest.fn() };
  const mockPublisher = { publishAll: jest.fn() };
  const mockSummary = { rebuild: jest.fn() };
  const mockAudit = { log: jest.fn() };
  const mockQueueService = { addJob: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationAssignmentService,
        { provide: 'IConversationRepository', useValue: mockRepo },
        { provide: AgentAssignmentService, useValue: mockEngine },
        { provide: ConversationEventPublisher, useValue: mockPublisher },
        { provide: ConversationSummaryService, useValue: mockSummary },
        { provide: AuditService, useValue: mockAudit },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get(ConversationAssignmentService);
    repo = module.get('IConversationRepository');
    engine = module.get(AgentAssignmentService);
    audit = module.get(AuditService);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((c: any) => Promise.resolve(c));
  });

  it('assigns an agent manually and records the assignment', async () => {
    const conversation = buildConversation(tenantId, conversationId);
    mockRepo.findById.mockResolvedValue(conversation);
    const agentId = randomUUID();

    const result = await service.assign(
      tenantId,
      conversationId,
      agentId,
      undefined,
      'MANUAL',
      'user-1',
    );

    expect(result.assignedAgentId).toBe(agentId);
    expect(result.status.value).toBe(ConversationStatusEnum.ASSIGNED);
    expect(repo.addAssignment).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CONVERSATION_ASSIGN' }),
    );
  });

  it('delegates to the team assignment engine for auto-assignment', async () => {
    const conversation = buildConversation(tenantId, conversationId);
    mockRepo.findById.mockResolvedValue(conversation);
    const teamId = randomUUID();
    const chosenAgent = randomUUID();
    mockEngine.assignEntity.mockResolvedValue(chosenAgent);

    const result = await service.autoAssign(
      tenantId,
      conversationId,
      teamId,
      'user-1',
    );

    expect(engine.assignEntity).toHaveBeenCalledWith(
      tenantId,
      teamId,
      conversationId,
      'CONVERSATION',
      expect.objectContaining({ priority: expect.any(Number) }),
    );
    expect(result.assignedAgentId).toBe(chosenAgent);
  });

  it('transfers a conversation to another agent', async () => {
    const conversation = buildConversation(tenantId, conversationId);
    conversation.assignAgent(randomUUID(), undefined, 'user-1');
    conversation.clearEvents();
    mockRepo.findById.mockResolvedValue(conversation);
    const toAgent = randomUUID();

    const result = await service.transfer(
      tenantId,
      conversationId,
      toAgent,
      'user-1',
    );

    expect(result.assignedAgentId).toBe(toAgent);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CONVERSATION_TRANSFER' }),
    );
  });

  it('throws NotFound when the conversation is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      service.assign(tenantId, conversationId, randomUUID()),
    ).rejects.toThrow(NotFoundException);
  });
});
