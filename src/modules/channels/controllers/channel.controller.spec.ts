import { Test, TestingModule } from '@nestjs/testing';
import { ChannelController } from './channel.controller';
import { ChannelWebhookController } from './channel-webhook.controller';
import { ChannelTemplateController } from './channel-template.controller';
import { ChannelHealthController } from './channel-health.controller';
import { ChannelService } from '../services/channel.service';
import { ChannelConfigurationService } from '../services/channel-configuration.service';
import { ChannelWebhookService } from '../services/channel-webhook.service';
import { ChannelTemplateService } from '../services/channel-template.service';
import { ChannelHealthService } from '../services/channel-health.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { TenantResolver } from '@easydev/shared-kernel';
import { randomUUID } from 'crypto';
import { ChannelTypeEnum } from '../domain/value-objects';
import {
  CreateChannelDto,
  UpdateChannelDto,
  ChannelConfigurationDto,
  ChannelWebhookDto,
  ChannelTemplateDto,
  ChannelQueryDto,
} from '../dtos';

describe('Channel Module Controllers', () => {
  let channelController: ChannelController;
  let webhookController: ChannelWebhookController;
  let templateController: ChannelTemplateController;
  let healthController: ChannelHealthController;

  let channelService: any;
  let configService: any;
  let webhookService: any;
  let templateService: any;
  let healthService: any;

  const mockChannelService = {
    create: jest.fn(),
    findPaginated: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  };

  const mockConfigService = {
    saveConfiguration: jest.fn(),
    getConfiguration: jest.fn(),
    rotateSecrets: jest.fn(),
  };

  const mockWebhookService = {
    registerWebhook: jest.fn(),
    verifyWebhook: jest.fn(),
    handleIncomingWebhook: jest.fn(),
  };

  const mockTemplateService = {
    createTemplate: jest.fn(),
    findTemplates: jest.fn(),
    findTemplateByName: jest.fn(),
    deleteTemplate: jest.fn(),
  };

  const mockHealthService = {
    checkHealth: jest.fn(),
    getHealth: jest.fn(),
  };

  const tenantId = randomUUID();
  const channelId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        ChannelController,
        ChannelWebhookController,
        ChannelTemplateController,
        ChannelHealthController,
      ],
      providers: [
        TenantResolver,
        { provide: ChannelService, useValue: mockChannelService },
        { provide: ChannelConfigurationService, useValue: mockConfigService },
        { provide: ChannelWebhookService, useValue: mockWebhookService },
        { provide: ChannelTemplateService, useValue: mockTemplateService },
        { provide: ChannelHealthService, useValue: mockHealthService },
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    channelController = module.get<ChannelController>(ChannelController);
    webhookController = module.get<ChannelWebhookController>(
      ChannelWebhookController,
    );
    templateController = module.get<ChannelTemplateController>(
      ChannelTemplateController,
    );
    healthController = module.get<ChannelHealthController>(
      ChannelHealthController,
    );

    channelService = module.get<ChannelService>(ChannelService);
    configService = module.get<ChannelConfigurationService>(
      ChannelConfigurationService,
    );
    webhookService = module.get<ChannelWebhookService>(ChannelWebhookService);
    templateService = module.get<ChannelTemplateService>(
      ChannelTemplateService,
    );
    healthService = module.get<ChannelHealthService>(ChannelHealthService);

    jest.clearAllMocks();
  });

  describe('ChannelController', () => {
    it('should create a channel', async () => {
      const dto: CreateChannelDto = {
        name: 'Support Chat',
        type: ChannelTypeEnum.WEBCHAT,
        provider: 'NATIVE',
      };
      mockChannelService.create.mockResolvedValue({
        toJSON: () => ({ id: channelId, name: 'Support Chat' }),
      });

      const res = await channelController.create(tenantId, dto, {
        user: { id: 'u1' },
      });
      expect(res).toEqual({ id: channelId, name: 'Support Chat' });
      expect(channelService.create).toHaveBeenCalledWith(tenantId, dto, 'u1');
    });

    it('should list paginated channels', async () => {
      const query: ChannelQueryDto = { page: 1, limit: 10 };
      mockChannelService.findPaginated.mockResolvedValue({
        data: [{ toJSON: () => ({ id: channelId }) }],
        total: 1,
      });

      const res = await channelController.findPaginated(tenantId, query);
      expect(res.data).toEqual([{ id: channelId }]);
      expect(res.total).toBe(1);
    });

    it('should get channel by ID', async () => {
      mockChannelService.findById.mockResolvedValue({
        toJSON: () => ({ id: channelId, name: 'Chat' }),
      });
      const res = await channelController.findById(tenantId, channelId);
      expect(res).toEqual({ id: channelId, name: 'Chat' });
      expect(channelService.findById).toHaveBeenCalledWith(tenantId, channelId);
    });

    it('should update channel properties', async () => {
      const dto: UpdateChannelDto = { name: 'New Name' };
      mockChannelService.update.mockResolvedValue({
        toJSON: () => ({ id: channelId, name: 'New Name' }),
      });
      const res = await channelController.update(tenantId, channelId, dto, {
        user: { id: 'u1' },
      });
      expect(res).toEqual({ id: channelId, name: 'New Name' });
    });

    it('should enable a channel', async () => {
      await channelController.enable(tenantId, channelId, {
        user: { id: 'u1' },
      });
      expect(channelService.enable).toHaveBeenCalledWith(
        tenantId,
        channelId,
        'u1',
      );
    });

    it('should disable a channel', async () => {
      await channelController.disable(tenantId, channelId, {
        user: { id: 'u1' },
      });
      expect(channelService.disable).toHaveBeenCalledWith(
        tenantId,
        channelId,
        'u1',
      );
    });

    it('should save config credentials', async () => {
      const dto: ChannelConfigurationDto = {
        authenticationType: 'API_KEY',
        configuration: {},
        credentials: {},
      };
      mockConfigService.saveConfiguration.mockResolvedValue({
        toJSON: () => ({ id: 'c1' }),
      });

      const res = await channelController.saveConfig(tenantId, channelId, dto, {
        user: { id: 'u1' },
      });
      expect(res).toEqual({ id: 'c1' });
    });

    it('should get config details', async () => {
      mockConfigService.getConfiguration.mockResolvedValue({
        toJSON: () => ({ authenticationType: 'API_KEY' }),
      });
      const res = await channelController.getConfig(tenantId, channelId);
      expect(res).toEqual({ authenticationType: 'API_KEY' });
    });

    it('should rotate config secrets', async () => {
      await channelController.rotateSecrets(tenantId, channelId, {
        user: { id: 'u1' },
      });
      expect(configService.rotateSecrets).toHaveBeenCalledWith(
        tenantId,
        channelId,
        'u1',
      );
    });
  });

  describe('ChannelWebhookController', () => {
    it('should register webhook', async () => {
      const dto: ChannelWebhookDto = { webhookUrl: 'https://site' };
      mockWebhookService.registerWebhook.mockResolvedValue({
        toJSON: () => ({ id: 'w1' }),
      });

      const res = await webhookController.register(tenantId, channelId, dto, {
        user: { id: 'u1' },
      });
      expect(res).toEqual({ id: 'w1' });
    });

    it('should verify challenge query', async () => {
      mockWebhookService.verifyWebhook.mockResolvedValue('challenge_ok');
      const res = await webhookController.verify(tenantId, channelId, {
        challenge: 'challenge_ok',
      });
      expect(res).toBe('challenge_ok');
    });

    it('should receive webhook triggers', async () => {
      const res = await webhookController.receive(
        tenantId,
        channelId,
        { text: 'hi' },
        { signature: 'sig' },
      );
      expect(res).toEqual({ status: 'queued' });
      expect(webhookService.handleIncomingWebhook).toHaveBeenCalledWith(
        tenantId,
        channelId,
        { text: 'hi' },
        { signature: 'sig' },
      );
    });
  });

  describe('ChannelTemplateController', () => {
    it('should create template', async () => {
      const dto: ChannelTemplateDto = {
        templateName: 'welcome',
        templateType: 'TEXT',
        templateContent: 'Hi',
      };
      mockTemplateService.createTemplate.mockResolvedValue({
        toJSON: () => ({ id: 't1' }),
      });

      const res = await templateController.create(tenantId, channelId, dto, {
        user: { id: 'u1' },
      });
      expect(res).toEqual({ id: 't1' });
    });

    it('should find templates for channel', async () => {
      mockTemplateService.findTemplates.mockResolvedValue([
        { toJSON: () => ({ templateName: 'wel' }) },
      ]);
      const res = await templateController.findTemplates(tenantId, channelId);
      expect(res).toEqual([{ templateName: 'wel' }]);
    });

    it('should find template by name', async () => {
      mockTemplateService.findTemplateByName.mockResolvedValue({
        toJSON: () => ({ templateName: 'wel' }),
      });
      const res = await templateController.findTemplateByName(
        tenantId,
        channelId,
        'wel',
      );
      expect(res).toEqual({ templateName: 'wel' });
    });

    it('should delete template by name', async () => {
      await templateController.deleteTemplate(tenantId, channelId, 'wel', {
        user: { id: 'u1' },
      });
      expect(templateService.deleteTemplate).toHaveBeenCalledWith(
        tenantId,
        channelId,
        'wel',
        'u1',
      );
    });
  });

  describe('ChannelHealthController', () => {
    it('should trigger health check and return results', async () => {
      mockHealthService.checkHealth.mockResolvedValue({
        status: 'HEALTHY',
        latencyMs: 5,
      });
      const res = await healthController.checkHealth(tenantId, channelId);
      expect(res).toEqual({ status: 'HEALTHY', latencyMs: 5 });
    });

    it('should get current health details', async () => {
      mockHealthService.getHealth.mockResolvedValue({ status: 'HEALTHY' });
      const res = await healthController.getHealth(tenantId, channelId);
      expect(res).toEqual({ status: 'HEALTHY' });
    });
  });
});
