import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { MessageQueueProcessor } from './message-queue.processor';
import { MessageDeliveryService } from '../services/message-delivery.service';
import { MessageAttachmentService } from '../services/message-attachment.service';
import { MessageDraftService } from '../services/message-draft.service';
import { MessageInboundService } from '../services/message-inbound.service';
import { QueueService } from '@easydev/shared-queues';

describe('MessageQueueProcessor', () => {
  let processor: MessageQueueProcessor;

  const mockDelivery = {
    dispatch: jest.fn(),
    applyDeliveryReceipt: jest.fn(),
    retry: jest.fn(),
  };
  const mockAttachment = { process: jest.fn() };
  const mockDraft = { cleanupExpired: jest.fn() };
  const mockInbound = { ingest: jest.fn() };
  const mockQueue = { addJob: jest.fn() };

  const tenantId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageQueueProcessor,
        { provide: MessageDeliveryService, useValue: mockDelivery },
        { provide: MessageAttachmentService, useValue: mockAttachment },
        { provide: MessageDraftService, useValue: mockDraft },
        { provide: MessageInboundService, useValue: mockInbound },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();

    processor = module.get(MessageQueueProcessor);
    jest.clearAllMocks();
  });

  it('routes message-send-job to dispatch', async () => {
    const messageId = randomUUID();
    mockDelivery.dispatch.mockResolvedValue({
      id: messageId,
      status: { value: 'SENT' },
    });
    const job: Partial<Job> = {
      name: 'message-send-job',
      id: 'j1',
      data: { messageId, _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(mockDelivery.dispatch).toHaveBeenCalledWith(tenantId, messageId);
    expect(res.status).toBe('SENT');
  });

  it('routes message-delivery-job to applyDeliveryReceipt', async () => {
    const messageId = randomUUID();
    mockDelivery.applyDeliveryReceipt.mockResolvedValue({
      id: messageId,
      status: { value: 'DELIVERED' },
    });
    const job: Partial<Job> = {
      name: 'message-delivery-job',
      id: 'j2',
      data: {
        messageId,
        status: 'DELIVERED',
        providerMessageId: 'p1',
        _tenantContext: { tenantId },
      },
    };
    const res = await processor.handleJob(job as any);
    expect(mockDelivery.applyDeliveryReceipt).toHaveBeenCalledWith(
      tenantId,
      messageId,
      'DELIVERED',
      'p1',
      undefined,
    );
    expect(res.status).toBe('DELIVERED');
  });

  it('routes attachment-processing-job', async () => {
    const attachmentId = randomUUID();
    const job: Partial<Job> = {
      name: 'attachment-processing-job',
      id: 'j3',
      data: { attachmentId, _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(mockAttachment.process).toHaveBeenCalledWith(tenantId, attachmentId);
    expect(res.processed).toBe(true);
  });

  it('routes draft-cleanup-job', async () => {
    mockDraft.cleanupExpired.mockResolvedValue({ removed: 4 });
    const job: Partial<Job> = {
      name: 'draft-cleanup-job',
      id: 'j4',
      data: { _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(res.removed).toBe(4);
  });

  it('routes message-inbound-job to the inbound pipeline', async () => {
    mockInbound.ingest.mockResolvedValue({ deduplicated: false });
    const payload = { channelId: randomUUID(), content: 'hi' };
    const job: Partial<Job> = {
      name: 'message-inbound-job',
      id: 'j5',
      data: { tenantId, payload, _tenantContext: { tenantId } },
    };
    await processor.handleJob(job as any);
    expect(mockInbound.ingest).toHaveBeenCalledWith(tenantId, payload);
  });

  it('forwards ai-workflow-trigger-job to the workflow queue', async () => {
    const messageId = randomUUID();
    const conversationId = randomUUID();
    const job: Partial<Job> = {
      name: 'ai-workflow-trigger-job',
      id: 'j6',
      data: { messageId, conversationId, _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(mockQueue.addJob).toHaveBeenCalledWith(
      'workflow-queue',
      'run-workflow',
      expect.objectContaining({ trigger: 'MESSAGE_RECEIVED', messageId }),
    );
    expect(res.triggered).toBe(true);
  });

  it('throws on an unknown job name', async () => {
    const job: Partial<Job> = {
      name: 'nope',
      id: 'j7',
      data: { _tenantContext: { tenantId } },
    };
    await expect(processor.handleJob(job as any)).rejects.toThrow(
      'Unknown job name: nope',
    );
  });
});
