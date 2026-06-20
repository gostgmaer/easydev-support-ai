import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { ConversationQueueProcessor } from './conversation-queue.processor';
import { ConversationService } from '../services/conversation.service';
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import { ConversationSummaryService } from '../services/conversation-summary.service';
import { InboxService } from '../services/inbox.service';

describe('ConversationQueueProcessor', () => {
  let processor: ConversationQueueProcessor;

  const mockConversationService = { merge: jest.fn(), archive: jest.fn() };
  const mockAssignmentService = { autoAssign: jest.fn() };
  const mockSummaryService = { rebuild: jest.fn() };
  const mockInboxService = { invalidate: jest.fn() };

  const tenantId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationQueueProcessor,
        { provide: ConversationService, useValue: mockConversationService },
        { provide: ConversationAssignmentService, useValue: mockAssignmentService },
        { provide: ConversationSummaryService, useValue: mockSummaryService },
        { provide: InboxService, useValue: mockInboxService },
      ],
    }).compile();

    processor = module.get(ConversationQueueProcessor);
    jest.clearAllMocks();
  });

  it('routes conversation-assignment-job to the assignment service', async () => {
    const conversationId = randomUUID();
    const teamId = randomUUID();
    mockAssignmentService.autoAssign.mockResolvedValue({ id: conversationId, assignedAgentId: 'a1' });

    const job: Partial<Job> = {
      name: 'conversation-assignment-job',
      id: 'j1',
      data: { conversationId, teamId, _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);

    expect(mockAssignmentService.autoAssign).toHaveBeenCalledWith(tenantId, conversationId, teamId, undefined);
    expect(res.assignedAgentId).toBe('a1');
  });

  it('routes conversation-summary-job and invalidates the inbox cache', async () => {
    const conversationId = randomUUID();
    mockSummaryService.rebuild.mockResolvedValue({ toJSON: () => ({ conversationId }) });

    const job: Partial<Job> = {
      name: 'conversation-summary-job',
      id: 'j2',
      data: { conversationId, _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);

    expect(mockSummaryService.rebuild).toHaveBeenCalledWith(tenantId, conversationId);
    expect(mockInboxService.invalidate).toHaveBeenCalledWith(tenantId);
    expect(res.rebuilt).toBe(true);
  });

  it('routes conversation-merge-job', async () => {
    mockConversationService.merge.mockResolvedValue({ id: 'target' });
    const job: Partial<Job> = {
      name: 'conversation-merge-job',
      id: 'j3',
      data: { sourceId: 's', targetId: 'target', _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(res.targetId).toBe('target');
  });

  it('routes conversation-archive-job', async () => {
    mockConversationService.archive.mockResolvedValue({ id: 'c1', status: { value: 'ARCHIVED' } });
    const job: Partial<Job> = {
      name: 'conversation-archive-job',
      id: 'j4',
      data: { conversationId: 'c1', _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(res.status).toBe('ARCHIVED');
  });

  it('throws on an unknown job name', async () => {
    const job: Partial<Job> = { name: 'nope', id: 'j5', data: { _tenantContext: { tenantId } } };
    await expect(processor.handleJob(job as any)).rejects.toThrow('Unknown job name: nope');
  });
});
