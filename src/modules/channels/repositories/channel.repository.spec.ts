import { DrizzleChannelRepository } from './drizzle-channel.repository';
import { db } from '@easydev/database';
import { Channel } from '../domain/channel.aggregate';
import { ChannelConfiguration } from '../domain/channel-configuration.entity';
import { ChannelWebhook } from '../domain/channel-webhook.entity';
import { ChannelTemplate } from '../domain/channel-template.entity';
import { ChannelRateLimit } from '../domain/channel-rate-limit.entity';
import { ChannelType, ChannelStatus, ChannelProvider, ChannelTypeEnum, ChannelStatusEnum } from '../domain/value-objects';
import { randomUUID } from 'crypto';

let mockResults: any[] = [];

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  then: jest.fn((resolve) => {
    const res = mockResults.length > 0 ? mockResults.shift() : [];
    resolve(res);
  }),
};

jest.mock('@easydev/database', () => {
  return {
    db: {
      select: jest.fn(() => queryBuilder),
      insert: jest.fn(() => queryBuilder),
      update: jest.fn(() => queryBuilder),
      delete: jest.fn(() => queryBuilder),
      transaction: jest.fn((cb) => cb(queryBuilder)),
    },
    schema: {
      channels: { id: 'channels.id', tenantId: 'channels.tenant_id', name: 'channels.name', deletedAt: 'channels.deleted_at', type: 'channels.type', status: 'channels.status', provider: 'channels.provider', createdAt: 'channels.created_at' },
      channelConfigurations: { id: 'channel_configs.id', tenantId: 'channel_configs.tenant_id', channelId: 'channel_configs.channel_id' },
      channelWebhooks: { id: 'channel_webhooks.id', tenantId: 'channel_webhooks.tenant_id', channelId: 'channel_webhooks.channel_id' },
      channelTemplates: { id: 'channel_templates.id', tenantId: 'channel_templates.tenant_id', channelId: 'channel_templates.channel_id', templateName: 'channel_templates.template_name' },
      channelRateLimits: { id: 'channel_rate_limits.id', tenantId: 'channel_rate_limits.tenant_id', channelId: 'channel_rate_limits.channel_id' },
    },
  };
});

describe('Channel Drizzle Repository', () => {
  let repo: DrizzleChannelRepository;
  const tenantId = randomUUID();
  const channelId = randomUUID();

  beforeEach(() => {
    repo = new DrizzleChannelRepository();
    mockResults = [];
    jest.clearAllMocks();
  });

  describe('findById & findByName', () => {
    it('should find channel and resolve configurations, webhooks, templates, and rate limits', async () => {
      mockResults.push(
        [{ id: channelId, tenantId, name: 'WA Meta', type: 'WHATSAPP', status: 'ACTIVE', provider: 'META' }], // rawChannel
        [{ id: 'c1', tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {} }], // rawConfig
        [{ id: 'w1', tenantId, channelId, webhookUrl: 'https://webhook' }], // rawWebhook
        [{ id: 't1', tenantId, channelId, templateName: 'temp', templateType: 'TEXT', templateContent: 'Hi', isActive: true }], // rawTemplates
        [{ id: 'r1', tenantId, channelId, providerLimit: 10, tenantLimit: 5, currentUsage: 0, resetAt: new Date() }] // rawRateLimit
      );

      const result = await repo.findById(channelId, tenantId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('WA Meta');
      expect(result?.configuration).toBeDefined();
      expect(result?.webhook).toBeDefined();
      expect(result?.templates.length).toBe(1);
      expect(result?.rateLimit).toBeDefined();
    });

    it('should return null if channel is not found', async () => {
      mockResults.push([]); // rawChannel empty
      const result = await repo.findById(channelId, tenantId);
      expect(result).toBeNull();
    });

    it('should find channel by name', async () => {
      mockResults.push(
        [{ id: channelId }], // name query selects raw id
        [{ id: channelId, tenantId, name: 'WA Meta', type: 'WHATSAPP', status: 'ACTIVE', provider: 'META' }] // findById query
      );

      const result = await repo.findByName('WA Meta', tenantId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(channelId);
    });
  });

  describe('findAll & findPaginated', () => {
    it('should findAll channels', async () => {
      mockResults.push(
        [{ id: channelId }], // findAll rows
        [{ id: channelId, tenantId, name: 'WA Meta', type: 'WHATSAPP', status: 'ACTIVE', provider: 'META' }] // findById query
      );

      const result = await repo.findAll(tenantId);
      expect(result.length).toBe(1);
    });

    it('should findPaginated channels with filtering and sorting', async () => {
      mockResults.push(
        [{ id: channelId }], // findPaginated rows
        [{ count: 1 }], // count rows
        [{ id: channelId, tenantId, name: 'WA Meta', type: 'WHATSAPP', status: 'ACTIVE', provider: 'META' }] // findById query
      );

      const result = await repo.findPaginated(tenantId, {
        page: 1,
        limit: 10,
        type: 'WHATSAPP',
        search: 'WA',
        sortOrder: 'DESC',
      });

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('save & delete', () => {
    it('should save a new channel with sub-entities within transaction', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WA Meta',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });

      const config = new ChannelConfiguration('c1', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {} });
      const webhook = new ChannelWebhook('w1', { tenantId, channelId, webhookUrl: 'https://site' });
      const rateLimit = new ChannelRateLimit('r1', { tenantId, channelId, resetAt: new Date() });

      channel.setConfiguration(config);
      channel.setWebhook(webhook);
      channel.setRateLimit(rateLimit);

      mockResults.push(
        [], // select channel -> insert
        [], // select config -> insert
        [], // select webhook -> insert
        [] // select rateLimit -> insert
      );

      const saved = await repo.save(channel, tenantId);
      expect(saved).toBe(channel);
      expect(db.transaction).toHaveBeenCalled();
      expect(queryBuilder.insert).toHaveBeenCalledTimes(4);
    });

    it('should update existing channel and config within transaction', async () => {
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WA Meta',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });
      const config = new ChannelConfiguration('c1', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {} });
      channel.setConfiguration(config);

      mockResults.push(
        [{ id: channelId }], // select channel -> found
        [],                  // update channel (awaited)
        [{ id: 'c1' }],      // select config -> found
        []                   // update config (awaited)
      );

      await repo.save(channel, tenantId);
      expect(queryBuilder.update).toHaveBeenCalledTimes(2);
    });

    it('should soft delete channel by setting deletedAt', async () => {
      mockResults.push([{ id: channelId }]); // existing select
      const result = await repo.delete(channelId, tenantId);
      expect(result).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return false when deleting non-existent channel', async () => {
      mockResults.push([]); // select empty
      const result = await repo.delete(channelId, tenantId);
      expect(result).toBe(false);
    });
  });

  describe('Template operations', () => {
    const templateName = 'welcome';

    it('should findTemplatesByChannelId and findTemplateByName', async () => {
      mockResults.push([{ id: 't1', tenantId, channelId, templateName, templateType: 'TEXT', templateContent: 'Hi', isActive: true }]);
      const templates = await repo.findTemplatesByChannelId(channelId, tenantId);
      expect(templates.length).toBe(1);

      mockResults.push([{ id: 't1', tenantId, channelId, templateName, templateType: 'TEXT', templateContent: 'Hi', isActive: true }]);
      const template = await repo.findTemplateByName(channelId, templateName, tenantId);
      expect(template?.templateName).toBe(templateName);

      // Template not found
      mockResults.push([]);
      const nullTemplate = await repo.findTemplateByName(channelId, 'missing', tenantId);
      expect(nullTemplate).toBeNull();
    });

    it('should save template (insert/update) and delete template', async () => {
      const template = new ChannelTemplate('t1', { tenantId, channelId, templateName, templateType: 'TEXT', templateContent: 'Hi' });

      mockResults.push([]); // select empty -> insert
      await repo.saveTemplate(template, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: 't1' }]); // select existing -> update
      await repo.saveTemplate(template, tenantId);
      expect(db.update).toHaveBeenCalled();

      await repo.deleteTemplate(channelId, templateName, tenantId);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Config, Webhook & Rate Limit operations', () => {
    it('should findConfigByChannelId, saveConfig (insert/update)', async () => {
      // findConfigByChannelId returning row
      mockResults.push([{ id: 'c1', tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {}, settings: {}, healthStatus: 'HEALTHY' }]);
      const config = await repo.findConfigByChannelId(channelId, tenantId);
      expect(config?.id).toBe('c1');

      // findConfigByChannelId returning empty
      mockResults.push([]);
      const emptyConfig = await repo.findConfigByChannelId(channelId, tenantId);
      expect(emptyConfig).toBeNull();

      // saveConfig (insert)
      mockResults.push([]); // select empty -> insert
      const newConfig = new ChannelConfiguration('c2', { tenantId, channelId, authenticationType: 'API_KEY', configuration: {}, credentials: {} });
      await repo.saveConfig(newConfig, tenantId);
      expect(db.insert).toHaveBeenCalled();

      // saveConfig (update)
      mockResults.push([{ id: 'c2' }]); // select exists -> update
      await repo.saveConfig(newConfig, tenantId);
      expect(db.update).toHaveBeenCalled();
    });

    it('should findWebhookByChannelId, saveWebhook (insert/update)', async () => {
      // findWebhookByChannelId returning row
      mockResults.push([{ id: 'w1', tenantId, channelId, webhookUrl: 'https://site', webhookSecret: 'sec', verificationToken: 'tok', status: 'ACTIVE' }]);
      const webhook = await repo.findWebhookByChannelId(channelId, tenantId);
      expect(webhook?.id).toBe('w1');

      // findWebhookByChannelId returning empty
      mockResults.push([]);
      const emptyWebhook = await repo.findWebhookByChannelId(channelId, tenantId);
      expect(emptyWebhook).toBeNull();

      // saveWebhook (insert)
      mockResults.push([]); // select empty -> insert
      const newWebhook = new ChannelWebhook('w2', { tenantId, channelId, webhookUrl: 'https://site' });
      await repo.saveWebhook(newWebhook, tenantId);
      expect(db.insert).toHaveBeenCalled();

      // saveWebhook (update)
      mockResults.push([{ id: 'w2' }]); // select exists -> update
      await repo.saveWebhook(newWebhook, tenantId);
      expect(db.update).toHaveBeenCalled();
    });

    it('should findRateLimitByChannelId, saveRateLimit (insert/update)', async () => {
      // findRateLimitByChannelId returning row
      mockResults.push([{ id: 'r1', tenantId, channelId, providerLimit: 10, tenantLimit: 5, currentUsage: 0, resetAt: new Date() }]);
      const rateLimit = await repo.findRateLimitByChannelId(channelId, tenantId);
      expect(rateLimit?.id).toBe('r1');

      // findRateLimitByChannelId returning empty
      mockResults.push([]);
      const emptyRateLimit = await repo.findRateLimitByChannelId(channelId, tenantId);
      expect(emptyRateLimit).toBeNull();

      // saveRateLimit (insert)
      mockResults.push([]); // select empty -> insert
      const newRateLimit = new ChannelRateLimit('r2', { tenantId, channelId, resetAt: new Date() });
      await repo.saveRateLimit(newRateLimit, tenantId);
      expect(db.insert).toHaveBeenCalled();

      // saveRateLimit (update)
      mockResults.push([{ id: 'r2' }]); // select exists -> update
      await repo.saveRateLimit(newRateLimit, tenantId);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
