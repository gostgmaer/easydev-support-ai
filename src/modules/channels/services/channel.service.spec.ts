import { Test, TestingModule } from '@nestjs/testing';
import {
  ChannelService,
  ChannelConfigurationService,
  ChannelWebhookService,
  ChannelTemplateService,
  ChannelHealthService,
  ChannelMessageService,
  ChannelEventPublisher,
} from './';
import { Channel } from '../domain/channel.aggregate';
import { ChannelConfiguration } from '../domain/channel-configuration.entity';
import { ChannelWebhook } from '../domain/channel-webhook.entity';
import { ChannelTemplate } from '../domain/channel-template.entity';
import { ChannelRateLimit } from '../domain/channel-rate-limit.entity';
import { ChannelType, ChannelStatus, ChannelProvider, ChannelTypeEnum, ChannelStatusEnum } from '../domain/value-objects';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';
import { ChannelConnectorRegistry } from '../connectors/channel-connector.registry';
import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateChannelDto, UpdateChannelDto, ChannelConfigurationDto, ChannelWebhookDto, ChannelTemplateDto, ChannelQueryDto } from '../dtos';

describe('Channel Module Services', () => {
  let channelService: ChannelService;
  let configService: ChannelConfigurationService;
  let webhookService: ChannelWebhookService;
  let templateService: ChannelTemplateService;
  let healthService: ChannelHealthService;
  let messageService: ChannelMessageService;

  let channelRepo: any;
  let eventPublisher: any;
  let auditService: any;
  let queueService: any;
  let connectorRegistry: any;

  const mockChannelRepo = {
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    findPaginated: jest.fn(),
    save: jest.fn((c) => Promise.resolve(c)),
    delete: jest.fn(),
    findConfigByChannelId: jest.fn(),
    saveConfig: jest.fn(),
    findWebhookByChannelId: jest.fn(),
    saveWebhook: jest.fn(),
    findTemplatesByChannelId: jest.fn(),
    findTemplateByName: jest.fn(),
    saveTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    findRateLimitByChannelId: jest.fn(),
    saveRateLimit: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
    publishAll: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  const mockConnector = {
    channelType: ChannelTypeEnum.WHATSAPP,
    sendMessage: jest.fn(),
    sendBulkMessages: jest.fn(),
    receiveMessage: jest.fn(),
    validateWebhook: jest.fn(),
    verifySignature: jest.fn(),
    normalizeMessage: jest.fn(),
    formatOutgoingMessage: jest.fn(),
    healthCheck: jest.fn(),
    getCapabilities: jest.fn(),
  };

  const mockConnectorRegistry = {
    getConnector: jest.fn(() => mockConnector),
  };

  const tenantId = randomUUID();
  const channelId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelService,
        ChannelConfigurationService,
        ChannelWebhookService,
        ChannelTemplateService,
        ChannelHealthService,
        ChannelMessageService,
        ChannelEventPublisher,
        { provide: 'IChannelRepository', useValue: mockChannelRepo },
        { provide: ChannelEventPublisher, useValue: mockEventPublisher },
        { provide: AuditService, useValue: mockAuditService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ChannelConnectorRegistry, useValue: mockConnectorRegistry },
      ],
    }).compile();

    channelService = module.get<ChannelService>(ChannelService);
    configService = module.get<ChannelConfigurationService>(ChannelConfigurationService);
    webhookService = module.get<ChannelWebhookService>(ChannelWebhookService);
    templateService = module.get<ChannelTemplateService>(ChannelTemplateService);
    healthService = module.get<ChannelHealthService>(ChannelHealthService);
    messageService = module.get<ChannelMessageService>(ChannelMessageService);

    channelRepo = module.get('IChannelRepository');
    eventPublisher = module.get(ChannelEventPublisher);
    auditService = module.get(AuditService);
    queueService = module.get(QueueService);
    connectorRegistry = module.get(ChannelConnectorRegistry);

    jest.clearAllMocks();
  });

  describe('ChannelService', () => {
    it('should create channel if name unique', async () => {
      channelRepo.findByName.mockResolvedValue(null);
      const dto: CreateChannelDto = { name: 'Support chat', type: ChannelTypeEnum.WEBCHAT, provider: 'NATIVE' };

      const result = await channelService.create(tenantId, dto, 'user-123');

      expect(result).toBeDefined();
      expect(result.name).toBe('Support chat');
      expect(channelRepo.save).toHaveBeenCalled();
      expect(eventPublisher.publishAll).toHaveBeenCalled();
    });

    it('should throw ConflictException if channel name already exists', async () => {
      channelRepo.findByName.mockResolvedValue({ id: 'exists' });
      const dto: CreateChannelDto = { name: 'Support chat', type: ChannelTypeEnum.WEBCHAT, provider: 'NATIVE' };

      await expect(channelService.create(tenantId, dto)).rejects.toThrow(ConflictException);
    });

    it('should update channel properties', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'Support chat',
        type: ChannelType.create(ChannelTypeEnum.WEBCHAT),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('NATIVE'),
        isActive: true,
        isDefault: false,
      });

      channelRepo.findById.mockResolvedValue(channel);

      const result = await channelService.update(tenantId, channelId, { name: 'New support name' }, 'user-123');
      expect(result.name).toBe('New support name');
    });

    it('should throw NotFoundException on update if channel does not exist', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(channelService.update(tenantId, channelId, { name: 'foo' })).rejects.toThrow(NotFoundException);
    });

    it('should enable and disable channels', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'Support chat',
        type: ChannelType.create(ChannelTypeEnum.WEBCHAT),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('NATIVE'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);

      await channelService.disable(tenantId, channelId, 'u1');
      expect(channel.isActive).toBe(false);

      await channelService.enable(tenantId, channelId, 'u1');
      expect(channel.isActive).toBe(true);
    });

    it('should throw NotFoundException on enable/disable if channel not found', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(channelService.enable(tenantId, channelId)).rejects.toThrow(NotFoundException);
      await expect(channelService.disable(tenantId, channelId)).rejects.toThrow(NotFoundException);
    });

    it('should find channel by ID and throw NotFoundException if missing', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'Support chat',
        type: ChannelType.create(ChannelTypeEnum.WEBCHAT),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('NATIVE'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValueOnce(channel);
      const found = await channelService.findById(tenantId, channelId);
      expect(found.id).toBe(channelId);

      channelRepo.findById.mockResolvedValueOnce(null);
      await expect(channelService.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('should find paginated channels', async () => {
      const query: ChannelQueryDto = { page: 1, limit: 10 };
      channelRepo.findPaginated.mockResolvedValue({ data: [], total: 0 });
      const res = await channelService.findPaginated(tenantId, query);
      expect(res.total).toBe(0);
      expect(channelRepo.findPaginated).toHaveBeenCalledWith(tenantId, query);
    });
  });

  describe('ChannelConfigurationService', () => {
    it('should save configuration and credentials', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'Support chat',
        type: ChannelType.create(ChannelTypeEnum.WEBCHAT),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('NATIVE'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findConfigByChannelId.mockResolvedValue(null);

      const dto: ChannelConfigurationDto = {
        authenticationType: 'API_KEY',
        configuration: { endpoint: 'http' },
        credentials: { key: 'secret' },
      };

      const config = await configService.saveConfiguration(tenantId, channelId, dto, 'u1');

      expect(config.authenticationType).toBe('API_KEY');
      expect(channelRepo.saveConfig).toHaveBeenCalled();
    });

    it('should update existing configuration', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'Support chat',
        type: ChannelType.create(ChannelTypeEnum.WEBCHAT),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('NATIVE'),
        isActive: true,
        isDefault: false,
      });
      const config = new ChannelConfiguration('c1', {
        tenantId,
        channelId,
        authenticationType: 'OAUTH',
        configuration: {},
        credentials: {},
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findConfigByChannelId.mockResolvedValue(config);

      const dto: ChannelConfigurationDto = {
        authenticationType: 'API_KEY',
        configuration: { url: 'updated' },
        credentials: { secret: 'updated' },
      };

      const result = await configService.saveConfiguration(tenantId, channelId, dto);
      expect(result.authenticationType).toBe('API_KEY');
      expect(result.configuration).toEqual({ url: 'updated' });
    });

    it('should throw NotFoundException on config save if channel not found', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(configService.saveConfiguration(tenantId, channelId, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should get configuration and throw NotFoundException if missing', async () => {
      const config = new ChannelConfiguration('c1', {
        tenantId,
        channelId,
        authenticationType: 'API_KEY',
        configuration: {},
        credentials: {},
      });
      channelRepo.findConfigByChannelId.mockResolvedValueOnce(config);
      const result = await configService.getConfiguration(tenantId, channelId);
      expect(result.id).toBe('c1');

      channelRepo.findConfigByChannelId.mockResolvedValueOnce(null);
      await expect(configService.getConfiguration(tenantId, channelId)).rejects.toThrow(NotFoundException);
    });

    it('should rotate configurations api key secrets', async () => {
      const config = new ChannelConfiguration('c1', {
        tenantId,
        channelId,
        authenticationType: 'API_KEY',
        configuration: {},
        credentials: { api_key: 'old' },
      });
      channelRepo.findConfigByChannelId.mockResolvedValue(config);

      await configService.rotateSecrets(tenantId, channelId, 'u1');

      expect(config.credentials.api_key).not.toBe('old');
      expect(channelRepo.saveConfig).toHaveBeenCalled();
    });

    it('should throw NotFoundException on rotateSecrets if config not found', async () => {
      channelRepo.findConfigByChannelId.mockResolvedValue(null);
      await expect(configService.rotateSecrets(tenantId, channelId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ChannelWebhookService', () => {
    it('should register webhook endpoints', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findWebhookByChannelId.mockResolvedValue(null);

      const dto: ChannelWebhookDto = { webhookUrl: 'https://site' };
      const webhook = await webhookService.registerWebhook(tenantId, channelId, dto, 'u1');

      expect(webhook.webhookUrl).toBe('https://site');
      expect(channelRepo.saveWebhook).toHaveBeenCalled();
    });

    it('should update registered webhook endpoints', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://old', webhookSecret: 's', verificationToken: 'v' });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findWebhookByChannelId.mockResolvedValue(webhook);

      const dto: ChannelWebhookDto = { webhookUrl: 'https://new' };
      const updated = await webhookService.registerWebhook(tenantId, channelId, dto);
      expect(updated.webhookUrl).toBe('https://new');
    });

    it('should throw NotFoundException on webhook register if channel not found', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(webhookService.registerWebhook(tenantId, channelId, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should verify token challenge on query', async () => {
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://site', verificationToken: 'tok123' });
      channelRepo.findWebhookByChannelId.mockResolvedValue(webhook);

      const res = await webhookService.verifyWebhook(tenantId, channelId, {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'tok123',
        'hub.challenge': 'chall',
      });
      expect(res).toBe('chall');
    });

    it('should throw BadRequestException on verifyWebhook if token mismatch', async () => {
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://site', verificationToken: 'tok123' });
      channelRepo.findWebhookByChannelId.mockResolvedValue(webhook);

      await expect(webhookService.verifyWebhook(tenantId, channelId, {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong',
      })).rejects.toThrow(BadRequestException);
    });

    it('should return OK on verifyWebhook if hub.mode and token not in query', async () => {
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://site', verificationToken: 'tok123' });
      channelRepo.findWebhookByChannelId.mockResolvedValue(webhook);

      const res = await webhookService.verifyWebhook(tenantId, channelId, {});
      expect(res).toBe('OK');
    });

    it('should throw NotFoundException on verifyWebhook if webhook config missing', async () => {
      channelRepo.findWebhookByChannelId.mockResolvedValue(null);
      await expect(webhookService.verifyWebhook(tenantId, channelId, {})).rejects.toThrow(NotFoundException);
    });

    it('should handle incoming webhook signature and dispatch job', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://site', webhookSecret: 'sec123' });

      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findWebhookByChannelId.mockResolvedValue(webhook);
      mockConnector.verifySignature.mockResolvedValue(true);
      mockConnector.validateWebhook.mockResolvedValue(true);
      mockConnector.normalizeMessage.mockResolvedValue({ externalMessageId: 'm1', content: 'hello' });

      await webhookService.handleIncomingWebhook(tenantId, channelId, { data: 'val' }, { signature: 'sig' });

      expect(queueService.addJob).toHaveBeenCalledWith(
        'channel-queue',
        'incoming-message-job',
        expect.any(Object)
      );
    });

    it('should throw BadRequestException if signature is invalid or webhook validation fails', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://site', webhookSecret: 'sec123' });

      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findWebhookByChannelId.mockResolvedValue(webhook);

      // Signature verification fails
      mockConnector.verifySignature.mockResolvedValueOnce(false);
      await expect(webhookService.handleIncomingWebhook(tenantId, channelId, {}, { signature: 'sig' })).rejects.toThrow(BadRequestException);

      // Webhook validation fails
      mockConnector.verifySignature.mockResolvedValueOnce(true);
      mockConnector.validateWebhook.mockResolvedValueOnce(false);
      await expect(webhookService.handleIncomingWebhook(tenantId, channelId, {}, { signature: 'sig' })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException on handleIncomingWebhook if channel or webhook not found', async () => {
      channelRepo.findById.mockResolvedValueOnce(null);
      await expect(webhookService.handleIncomingWebhook(tenantId, channelId, {}, {})).rejects.toThrow(NotFoundException);

      channelRepo.findById.mockResolvedValueOnce({ id: 'chan' });
      channelRepo.findWebhookByChannelId.mockResolvedValueOnce(null);
      await expect(webhookService.handleIncomingWebhook(tenantId, channelId, {}, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('ChannelTemplateService', () => {
    it('should create template if unique', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findTemplateByName.mockResolvedValue(null);

      const dto: ChannelTemplateDto = { templateName: 'welcome', templateType: 'TEXT', templateContent: 'Hi' };
      const temp = await templateService.createTemplate(tenantId, channelId, dto, 'u1');

      expect(temp.templateName).toBe('welcome');
      expect(channelRepo.saveTemplate).toHaveBeenCalled();
    });

    it('should throw ConflictException on template create if name exists', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findTemplateByName.mockResolvedValue({ id: 'exists' });

      const dto: ChannelTemplateDto = { templateName: 'welcome', templateType: 'TEXT', templateContent: 'Hi' };
      await expect(templateService.createTemplate(tenantId, channelId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException on template create if channel missing', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(templateService.createTemplate(tenantId, channelId, { templateName: 'wel' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should find templates, findTemplateByName and deleteTemplate', async () => {
      channelRepo.findTemplatesByChannelId.mockResolvedValue([]);
      const list = await templateService.findTemplates(tenantId, channelId);
      expect(list).toEqual([]);

      const temp = new ChannelTemplate('t1', { tenantId, channelId, templateName: 'wel', templateType: 'TEXT', templateContent: 'h' });
      channelRepo.findTemplateByName.mockResolvedValueOnce(temp);
      const found = await templateService.findTemplateByName(tenantId, channelId, 'wel');
      expect(found.templateName).toBe('wel');

      channelRepo.findTemplateByName.mockResolvedValueOnce(null);
      await expect(templateService.findTemplateByName(tenantId, channelId, 'missing')).rejects.toThrow(NotFoundException);

      // delete Template
      channelRepo.findTemplateByName.mockResolvedValueOnce(temp);
      await templateService.deleteTemplate(tenantId, channelId, 'wel', 'u1');
      expect(channelRepo.deleteTemplate).toHaveBeenCalledWith(channelId, 'wel', tenantId);

      channelRepo.findTemplateByName.mockResolvedValueOnce(null);
      await expect(templateService.deleteTemplate(tenantId, channelId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ChannelHealthService', () => {
    it('should checkHealth and notify failed when connector offline', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const config = new ChannelConfiguration('c1', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {}, healthStatus: 'UNKNOWN' });

      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findConfigByChannelId.mockResolvedValue(config);
      mockConnector.healthCheck.mockResolvedValue({ status: 'OFFLINE', latencyMs: 0, error: 'Failed' });

      const res = await healthService.checkHealth(tenantId, channelId);

      expect(res.status).toBe('UNHEALTHY');
      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should checkHealth restore and trigger success event', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const config = new ChannelConfiguration('c1', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {}, healthStatus: 'UNHEALTHY' });

      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findConfigByChannelId.mockResolvedValue(config);
      mockConnector.healthCheck.mockResolvedValue({ status: 'ONLINE', latencyMs: 15 });

      const res = await healthService.checkHealth(tenantId, channelId);

      expect(res.status).toBe('HEALTHY');
      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should handle connector throw in checkHealth as OFFLINE', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const config = new ChannelConfiguration('c1', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {}, healthStatus: 'HEALTHY' });

      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findConfigByChannelId.mockResolvedValue(config);
      mockConnector.healthCheck.mockRejectedValue(new Error('Network Crash'));

      const res = await healthService.checkHealth(tenantId, channelId);
      expect(res.status).toBe('UNHEALTHY');
      expect(res.error).toBe('Network Crash');
    });

    it('should throw NotFoundException in checkHealth if channel or config missing', async () => {
      channelRepo.findById.mockResolvedValueOnce(null);
      await expect(healthService.checkHealth(tenantId, channelId)).rejects.toThrow(NotFoundException);

      channelRepo.findById.mockResolvedValueOnce({ id: 'c1' });
      channelRepo.findConfigByChannelId.mockResolvedValueOnce(null);
      await expect(healthService.checkHealth(tenantId, channelId)).rejects.toThrow(NotFoundException);
    });

    it('should getHealth or throw NotFoundException', async () => {
      const config = new ChannelConfiguration('c1', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {}, healthStatus: 'HEALTHY', lastHealthCheck: new Date() });
      channelRepo.findConfigByChannelId.mockResolvedValueOnce(config);

      const health = await healthService.getHealth(tenantId, channelId);
      expect(health.healthStatus).toBe('HEALTHY');

      channelRepo.findConfigByChannelId.mockResolvedValueOnce(null);
      await expect(healthService.getHealth(tenantId, channelId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ChannelMessageService', () => {
    it('should process incoming webhook, validate spam, and publish messages', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findRateLimitByChannelId.mockResolvedValue(null);
      mockConnector.normalizeMessage.mockResolvedValue({ externalMessageId: 'm1', content: 'Legit message text' });

      await messageService.processIncomingWebhook(tenantId, channelId, {}, {});

      expect(eventPublisher.publish).toHaveBeenCalledTimes(2); // message received + normalized
    });

    it('should throw BadRequestException if rate limit is exceeded', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const limit = new ChannelRateLimit('l1', { tenantId, channelId, providerLimit: 10, tenantLimit: 10, currentUsage: 11, resetAt: new Date(Date.now() + 10000) });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findRateLimitByChannelId.mockResolvedValue(limit);

      await expect(messageService.processIncomingWebhook(tenantId, channelId, {}, {})).rejects.toThrow(BadRequestException);
    });

    it('should drop messages flagged as spam', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findRateLimitByChannelId.mockResolvedValue(null);
      mockConnector.normalizeMessage.mockResolvedValue({ externalMessageId: 'm1', content: 'You are a lottery winner!' });

      await messageService.processIncomingWebhook(tenantId, channelId, {}, {});
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException on processIncomingWebhook if channel missing', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(messageService.processIncomingWebhook(tenantId, channelId, {}, {})).rejects.toThrow(NotFoundException);
    });

    it('should send outgoing message by queue dispatch', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);

      await messageService.sendOutgoingMessage(tenantId, channelId, 'rec1', 'hello');

      expect(queueService.addJob).toHaveBeenCalledWith(
        'channel-queue',
        'outgoing-message-job',
        { channelId, recipientId: 'rec1', content: 'hello' }
      );
    });

    it('should resolve templates and replace variables on outgoing messages', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const template = new ChannelTemplate('t1', { tenantId, channelId, templateName: 'welcome', templateType: 'TEXT', templateContent: 'Hello {{name}}' });
      channelRepo.findById.mockResolvedValue(channel);
      channelRepo.findTemplateByName.mockResolvedValue(template);

      await messageService.sendOutgoingMessage(tenantId, channelId, 'rec1', null, { templateName: 'welcome', variables: { name: 'Kishore' } });

      expect(queueService.addJob).toHaveBeenCalledWith(
        'channel-queue',
        'outgoing-message-job',
        { channelId, recipientId: 'rec1', content: 'Hello Kishore' }
      );
    });

    it('should throw NotFoundException on sendOutgoingMessage if channel or template not found', async () => {
      channelRepo.findById.mockResolvedValueOnce(null);
      await expect(messageService.sendOutgoingMessage(tenantId, channelId, 'r', 'c')).rejects.toThrow(NotFoundException);

      channelRepo.findById.mockResolvedValueOnce({ id: 'c1' });
      channelRepo.findTemplateByName.mockResolvedValueOnce(null);
      await expect(messageService.sendOutgoingMessage(tenantId, channelId, 'r', null, { templateName: 'wel' })).rejects.toThrow(NotFoundException);
    });

    it('should deliver outgoing message successfully via connector', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      mockConnector.formatOutgoingMessage.mockResolvedValue({ text: 'hello' });
      mockConnector.sendMessage.mockResolvedValue({ messageId: 'm1', status: 'SENT' });

      await messageService.deliverOutgoingMessage(tenantId, channelId, 'rec1', 'hello');

      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should throw error on deliverOutgoingMessage if status not SENT', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      mockConnector.formatOutgoingMessage.mockResolvedValue({ text: 'hello' });
      mockConnector.sendMessage.mockResolvedValue({ status: 'FAILED', error: 'Blocked by provider' });

      await expect(messageService.deliverOutgoingMessage(tenantId, channelId, 'rec1', 'hello')).rejects.toThrow('Blocked by provider');
      expect(eventPublisher.publish).toHaveBeenCalled(); // MessageFailedEvent
    });

    it('should catch error on deliverOutgoingMessage if connector throws', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      channelRepo.findById.mockResolvedValue(channel);
      mockConnector.formatOutgoingMessage.mockRejectedValue(new Error('Connector crashed'));

      await expect(messageService.deliverOutgoingMessage(tenantId, channelId, 'rec1', 'hello')).rejects.toThrow('Connector crashed');
      expect(eventPublisher.publish).toHaveBeenCalled(); // MessageFailedEvent
    });

    it('should throw NotFoundException on deliverOutgoingMessage if channel missing', async () => {
      channelRepo.findById.mockResolvedValue(null);
      await expect(messageService.deliverOutgoingMessage(tenantId, channelId, 'r', 'c')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ChannelEventPublisher (try-catch & publishAll branches)', () => {
    it('should handle publisher queue addJob error silently and log', async () => {
      const publisher = new ChannelEventPublisher(queueService);
      queueService.addJob.mockRejectedValue(new Error('Queue unavailable'));

      const event = {
        constructor: { eventName: 'channel.health.failed' },
        getAggregateId: () => 'c1',
        getTenantId: () => 't1',
      };

      await expect(publisher.publish(event as any)).resolves.not.toThrow();
    });

    it('should publish all events in bulk', async () => {
      const publisher = new ChannelEventPublisher(queueService);
      const event1 = { constructor: { eventName: 'other' }, getAggregateId: () => '1', getTenantId: () => 't1' };
      const event2 = { constructor: { eventName: 'other' }, getAggregateId: () => '2', getTenantId: () => 't1' };

      await publisher.publishAll([event1 as any, event2 as any]);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });
  });
});
