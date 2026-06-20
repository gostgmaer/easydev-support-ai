import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessageDeliveryService } from './message-delivery.service';
import { MessageEventPublisher } from './message-event.publisher';
import { MessageReadModelService } from './message-read-model.service';
import { MessageTemplateService } from './message-template.service';
import { ChannelMessageService } from '../../channels/services/channel-message.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';
import { Message } from '../domain/message.aggregate';
import {
  MessageType,
  MessageTypeEnum,
  MessageDirection,
  MessageDirectionEnum,
  MessageStatus,
  MessageStatusEnum,
} from '../domain/value-objects';

function buildMessage(
  tenantId: string,
  id: string,
  status = MessageStatusEnum.QUEUED,
  direction = MessageDirectionEnum.OUTBOUND,
): Message {
  const m = Message.create(id, {
    tenantId,
    conversationId: randomUUID(),
    channelId: randomUUID(),
    customerId: randomUUID(),
    senderType: 'AGENT',
    messageType: MessageType.create(MessageTypeEnum.TEXT),
    direction: MessageDirection.create(direction),
    content: 'hi',
    status: MessageStatus.create(status),
  });
  m.clearEvents();
  return m;
}

describe('MessageDeliveryService', () => {
  let service: MessageDeliveryService;
  let repo: any;
  let queue: any;
  let channel: any;

  const tenantId = randomUUID();
  const messageId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    save: jest.fn((m) => Promise.resolve(m)),
    saveDeliveryStatus: jest.fn(),
    findDeliveryStatuses: jest.fn().mockResolvedValue([]),
  };
  const mockQueue = { addJob: jest.fn() };
  const mockPublisher = { publishAll: jest.fn() };
  const mockReadModel = { refresh: jest.fn() };
  const mockTemplate = { render: jest.fn() };
  const mockChannel = { sendOutgoingMessage: jest.fn() };
  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageDeliveryService,
        { provide: 'IMessageRepository', useValue: mockRepo },
        { provide: QueueService, useValue: mockQueue },
        { provide: MessageEventPublisher, useValue: mockPublisher },
        { provide: MessageReadModelService, useValue: mockReadModel },
        { provide: MessageTemplateService, useValue: mockTemplate },
        { provide: ChannelMessageService, useValue: mockChannel },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(MessageDeliveryService);
    repo = module.get('IMessageRepository');
    queue = module.get(QueueService);
    channel = module.get(ChannelMessageService);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((m: any) => Promise.resolve(m));
    mockRepo.findDeliveryStatuses.mockResolvedValue([]);
  });

  it('queues a send and marks the message PROCESSING', async () => {
    const message = buildMessage(tenantId, messageId);
    mockRepo.findById.mockResolvedValue(message);

    const result = await service.queueSend(tenantId, messageId, {}, 'user-1');

    expect(result.status.value).toBe(MessageStatusEnum.PROCESSING);
    expect(queue.addJob).toHaveBeenCalledWith(
      'message-queue',
      'message-send-job',
      expect.objectContaining({ messageId }),
    );
  });

  it('renders a template before queueing when requested', async () => {
    const message = buildMessage(tenantId, messageId);
    mockRepo.findById.mockResolvedValue(message);
    mockTemplate.render.mockResolvedValue('Hello Jane');

    const result = await service.queueSend(tenantId, messageId, {
      templateName: 'greeting',
      variables: { name: 'Jane' },
    });

    expect(mockTemplate.render).toHaveBeenCalledWith(tenantId, 'greeting', {
      name: 'Jane',
    });
    expect(result.content).toBe('Hello Jane');
  });

  it('rejects sending inbound messages', async () => {
    const message = buildMessage(
      tenantId,
      messageId,
      MessageStatusEnum.DELIVERED,
      MessageDirectionEnum.INBOUND,
    );
    mockRepo.findById.mockResolvedValue(message);
    await expect(service.queueSend(tenantId, messageId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('dispatches through the channel module and marks SENT', async () => {
    const message = buildMessage(tenantId, messageId);
    mockRepo.findById.mockResolvedValue(message);
    mockChannel.sendOutgoingMessage.mockResolvedValue(undefined);

    const result = await service.dispatch(tenantId, messageId);

    expect(channel.sendOutgoingMessage).toHaveBeenCalled();
    expect(result.status.value).toBe(MessageStatusEnum.SENT);
    expect(repo.saveDeliveryStatus).toHaveBeenCalled();
  });

  it('marks FAILED and rethrows when the channel dispatch fails (for DLQ)', async () => {
    const message = buildMessage(tenantId, messageId);
    mockRepo.findById.mockResolvedValue(message);
    mockChannel.sendOutgoingMessage.mockRejectedValue(
      new Error('provider down'),
    );

    await expect(service.dispatch(tenantId, messageId)).rejects.toThrow(
      'provider down',
    );
    expect(message.status.value).toBe(MessageStatusEnum.FAILED);
  });

  it('applies a delivery receipt and refreshes the read model', async () => {
    const message = buildMessage(tenantId, messageId, MessageStatusEnum.SENT);
    mockRepo.findById.mockResolvedValue(message);

    const result = await service.applyDeliveryReceipt(
      tenantId,
      messageId,
      MessageStatusEnum.DELIVERED,
      'provider-1',
    );

    expect(result.status.value).toBe(MessageStatusEnum.DELIVERED);
    expect(mockReadModel.refresh).toHaveBeenCalledWith(
      tenantId,
      message.conversationId,
    );
  });
});
