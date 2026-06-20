import { Test, TestingModule } from '@nestjs/testing';
import { ChannelQueueProcessor } from './channel-queue.processor';
import { ChannelMessageService } from '../services/channel-message.service';
import { ChannelHealthService } from '../services/channel-health.service';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';

describe('ChannelQueueProcessor', () => {
  let processor: ChannelQueueProcessor;
  let messageService: any;
  let healthService: any;

  const mockMessageService = {
    processIncomingWebhook: jest.fn(),
    deliverOutgoingMessage: jest.fn(),
  };

  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  const tenantId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelQueueProcessor,
        { provide: ChannelMessageService, useValue: mockMessageService },
        { provide: ChannelHealthService, useValue: mockHealthService },
      ],
    }).compile();

    processor = module.get<ChannelQueueProcessor>(ChannelQueueProcessor);
    messageService = module.get<ChannelMessageService>(ChannelMessageService);
    healthService = module.get<ChannelHealthService>(ChannelHealthService);

    jest.clearAllMocks();
  });

  describe('handleJob', () => {
    it('should handle incoming-message-job', async () => {
      const job: Partial<Job> = {
        name: 'incoming-message-job',
        id: 'job-1',
        data: {
          channelId: 'c1',
          payload: { text: 'hi' },
          headers: {},
          tenantId,
        },
      };

      await processor.handleJob(job as any);

      expect(messageService.processIncomingWebhook).toHaveBeenCalledWith(
        tenantId,
        'c1',
        { text: 'hi' },
        {},
      );
    });

    it('should handle outgoing-message-job', async () => {
      const job: Partial<Job> = {
        name: 'outgoing-message-job',
        id: 'job-2',
        data: {
          channelId: 'c1',
          recipientId: 'r1',
          content: 'hello',
          tenantId,
        },
      };

      await processor.handleJob(job as any);

      expect(messageService.deliverOutgoingMessage).toHaveBeenCalledWith(
        tenantId,
        'c1',
        'r1',
        'hello',
      );
    });

    it('should handle channel-health-job', async () => {
      const job: Partial<Job> = {
        name: 'channel-health-job',
        id: 'job-3',
        data: {
          channelId: 'c1',
          tenantId,
        },
      };

      await processor.handleJob(job as any);

      expect(healthService.checkHealth).toHaveBeenCalledWith(tenantId, 'c1');
    });

    it('should handle template-sync-job', async () => {
      const job: Partial<Job> = {
        name: 'template-sync-job',
        id: 'job-4',
        data: {
          tenantId,
        },
      };

      const res = await processor.handleJob(job as any);
      expect(res.synced).toBe(true);
    });

    it('should handle delivery-status-job', async () => {
      const job: Partial<Job> = {
        name: 'delivery-status-job',
        id: 'job-5',
        data: {
          messageId: 'msg123',
          tenantId,
        },
      };

      const res = await processor.handleJob(job as any);
      expect(res.status).toBe('DELIVERED');
      expect(res.messageId).toBe('msg123');
    });

    it('should throw error on unknown job name', async () => {
      const job: Partial<Job> = {
        name: 'unknown-job',
        id: 'job-6',
        data: {
          tenantId,
        },
      };

      await expect(processor.handleJob(job as any)).rejects.toThrow(
        'Unknown job name: unknown-job',
      );
    });
  });
});
