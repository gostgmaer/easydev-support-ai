import { Channel } from './channel.aggregate';
import { ChannelConfiguration } from './channel-configuration.entity';
import { ChannelWebhook } from './channel-webhook.entity';
import { ChannelTemplate } from './channel-template.entity';
import { ChannelRateLimit } from './channel-rate-limit.entity';
import {
  ChannelId,
  ChannelType,
  ChannelTypeEnum,
  ChannelProvider,
  WebhookSecret,
  ChannelStatus,
  ChannelStatusEnum,
} from './value-objects';
import { randomUUID } from 'crypto';

describe('Channel Domain Model', () => {
  const tenantId = randomUUID();

  describe('Value Objects', () => {
    it('should validate ChannelId', () => {
      expect(() => ChannelId.create('invalid-uuid')).toThrow();
      expect(ChannelId.create(randomUUID()).value).toBeDefined();
    });

    it('should validate ChannelType', () => {
      expect(() => ChannelType.create('UNKNOWN' as any)).toThrow();
      expect(ChannelType.create(ChannelTypeEnum.WHATSAPP).value).toBe(
        ChannelTypeEnum.WHATSAPP,
      );
    });

    it('should validate ChannelProvider', () => {
      expect(() => ChannelProvider.create('')).toThrow();
      expect(ChannelProvider.create('Meta').value).toBe('META');
    });

    it('should validate WebhookSecret', () => {
      expect(() => WebhookSecret.create('short')).toThrow();
      expect(
        WebhookSecret.create('very-long-secret-key-123').value,
      ).toBeDefined();
    });

    it('should validate ChannelStatus', () => {
      expect(() => ChannelStatus.create('UNKNOWN' as any)).toThrow();
      expect(ChannelStatus.create(ChannelStatusEnum.ACTIVE).value).toBe(
        ChannelStatusEnum.ACTIVE,
      );
    });
  });

  describe('Channel Entities', () => {
    it('should update configurations properties', () => {
      const config = new ChannelConfiguration(randomUUID(), {
        tenantId,
        channelId: randomUUID(),
        authenticationType: 'API_KEY',
        configuration: { url: 'https://wa.api' },
        credentials: { token: 't1' },
      });

      config.update({ authenticationType: 'OAUTH2' });
      expect(config.authenticationType).toBe('OAUTH2');
    });

    it('should update webhook properties', () => {
      const webhook = new ChannelWebhook(randomUUID(), {
        tenantId,
        channelId: randomUUID(),
        webhookUrl: 'https://site.com',
      });

      webhook.update({ webhookUrl: 'https://new.com' });
      expect(webhook.webhookUrl).toBe('https://new.com');
    });

    it('should manage templates and toggle active state', () => {
      const template = new ChannelTemplate(randomUUID(), {
        tenantId,
        channelId: randomUUID(),
        templateName: 'welcome',
        templateType: 'TEXT',
        templateContent: 'Hello {{name}}',
      });

      template.update({ isActive: false });
      expect(template.isActive).toBe(false);
    });

    it('should track rate limit triggers', () => {
      const resetAt = new Date(Date.now() + 5000);
      const limit = new ChannelRateLimit(randomUUID(), {
        tenantId,
        channelId: randomUUID(),
        providerLimit: 10,
        tenantLimit: 2,
        resetAt,
      });

      expect(limit.isRateLimited()).toBe(false);
      limit.incrementUsage();
      limit.incrementUsage();
      expect(limit.isRateLimited()).toBe(true);
    });
  });

  describe('Channel Aggregate Root', () => {
    it('should create channel aggregate and attach domain events', () => {
      const channelId = randomUUID();
      const channel = Channel.create(channelId, {
        tenantId,
        name: 'WhatsApp Business',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });

      expect(channel.id).toBe(channelId);
      expect(channel.name).toBe('WhatsApp Business');
      expect(channel.domainEvents.length).toBe(1);
      expect((channel.domainEvents[0] as any).constructor.eventName).toBe(
        'channel.created',
      );
    });

    it('should support enabling and disabling channel with events', () => {
      const channel = Channel.create(randomUUID(), {
        tenantId,
        name: 'WhatsApp Business',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });

      channel.clearEvents();
      channel.disable();
      expect(channel.isActive).toBe(false);
      expect(channel.domainEvents.length).toBe(1);
      expect((channel.domainEvents[0] as any).constructor.eventName).toBe(
        'channel.disabled',
      );

      channel.clearEvents();
      channel.enable();
      expect(channel.isActive).toBe(true);
      expect(channel.domainEvents.length).toBe(1);
      expect((channel.domainEvents[0] as any).constructor.eventName).toBe(
        'channel.enabled',
      );
    });

    it('should manage templates array and metadata updates', () => {
      const channel = Channel.create(randomUUID(), {
        tenantId,
        name: 'WhatsApp Business',
        type: ChannelType.create(ChannelTypeEnum.WHATSAPP),
        status: ChannelStatus.create(ChannelStatusEnum.ACTIVE),
        provider: ChannelProvider.create('Meta'),
        isActive: true,
        isDefault: false,
      });

      channel.update({ name: 'WhatsApp Meta' });
      expect(channel.name).toBe('WhatsApp Meta');

      const template = new ChannelTemplate(randomUUID(), {
        tenantId,
        channelId: channel.id,
        templateName: 'alert',
        templateType: 'TEXT',
        templateContent: 'Hi',
      });

      channel.addTemplate(template);
      expect(channel.templates.length).toBe(1);

      channel.removeTemplate('alert');
      expect(channel.templates.length).toBe(0);
    });
  });
});
