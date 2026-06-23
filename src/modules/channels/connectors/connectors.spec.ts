import {
  WebChatConnector,
  EmailConnector,
  WhatsAppConnector,
  TelegramConnector,
  FacebookConnector,
  InstagramConnector,
  SlackConnector,
  TeamsConnector,
} from './implementations';
import { ChannelConnectorRegistry } from './channel-connector.registry';
import { ChannelTypeEnum } from '../domain/value-objects';
import { randomUUID, createHmac } from 'crypto';
import { NotFoundException } from '@nestjs/common';

const hmacHex = (secret: string, data: string) =>
  createHmac('sha256', secret).update(data).digest('hex');

describe('Channel Connector Implementations & Registry', () => {
  const tenantId = randomUUID();
  const channelId = randomUUID();
  const recipientId = 'user-123';

  describe('ChannelConnectorRegistry', () => {
    it('should register and retrieve all connectors', () => {
      const connectors = [
        new WebChatConnector(),
        new EmailConnector(),
        new WhatsAppConnector(),
        new TelegramConnector(),
        new FacebookConnector(),
        new InstagramConnector(),
        new SlackConnector(),
        new TeamsConnector(),
      ];
      const registry = new ChannelConnectorRegistry(connectors);

      expect(registry.getConnector(ChannelTypeEnum.WEBCHAT)).toBeInstanceOf(
        WebChatConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.EMAIL)).toBeInstanceOf(
        EmailConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.WHATSAPP)).toBeInstanceOf(
        WhatsAppConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.TELEGRAM)).toBeInstanceOf(
        TelegramConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.FACEBOOK)).toBeInstanceOf(
        FacebookConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.INSTAGRAM)).toBeInstanceOf(
        InstagramConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.SLACK)).toBeInstanceOf(
        SlackConnector,
      );
      expect(registry.getConnector(ChannelTypeEnum.TEAMS)).toBeInstanceOf(
        TeamsConnector,
      );

      expect(() => registry.getConnector('INVALID' as any)).toThrow(
        NotFoundException,
      );
    });
  });

  const runCommonConnectorTests = (
    connector: any,
    type: ChannelTypeEnum,
    webhookPayload: any = {},
    signatureFixture: {
      signature?: string;
      secret?: string;
      headers?: Record<string, string>;
    } = { signature: 'sig', secret: 'sig' },
  ) => {
    describe(`${connector.constructor.name} - Common Checks`, () => {
      it('should return correct channel type and capabilities', () => {
        expect(connector.channelType).toBe(type);
        expect(connector.getCapabilities()).toBeInstanceOf(Array);
        expect(connector.getCapabilities().length).toBeGreaterThan(0);
      });

      it('should support webhooks, receive messages, verify signatures and perform health checks', async () => {
        const received = await connector.receiveMessage(tenantId, channelId, {
          raw: true,
        });
        expect(received).toEqual({ raw: true });

        const validWebhook = await connector.validateWebhook(
          tenantId,
          channelId,
          webhookPayload,
          signatureFixture.headers || {},
        );
        expect(validWebhook).toBe(true);

        const sig = await connector.verifySignature(
          tenantId,
          channelId,
          webhookPayload,
          signatureFixture.signature || '',
          signatureFixture.secret || '',
          signatureFixture.headers || {},
        );
        expect(sig).toBe(true);

        const health = await connector.healthCheck(tenantId, channelId);
        expect(health.status).toBe('ONLINE');
        expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      });

      it('should send single and bulk messages', async () => {
        const res = await connector.sendMessage(
          tenantId,
          channelId,
          recipientId,
          'hello',
        );
        expect(res.status).toBe('SENT');
        expect(res.messageId).toBeDefined();

        const bulk = await connector.sendBulkMessages(
          tenantId,
          channelId,
          [recipientId],
          'hello',
        );
        expect(bulk.length).toBe(1);
        expect(bulk[0].recipientId).toBe(recipientId);
        expect(bulk[0].status).toBe('SENT');
      });
    });
  };

  runCommonConnectorTests(new WebChatConnector(), ChannelTypeEnum.WEBCHAT);

  {
    const payload = [{ event: 'delivered', email: 'a@b.com' }];
    const secret = 'email-secret';
    const signature = hmacHex(secret, JSON.stringify(payload));
    runCommonConnectorTests(new EmailConnector(), ChannelTypeEnum.EMAIL, payload, {
      secret,
      headers: { 'x-sendgrid-signature': signature },
    });
  }

  {
    const payload = { entry: [{ changes: [{ value: { messages: [] } }] }] };
    const secret = 'whatsapp-secret';
    const signature = `sha256=${hmacHex(secret, JSON.stringify(payload))}`;
    runCommonConnectorTests(
      new WhatsAppConnector(),
      ChannelTypeEnum.WHATSAPP,
      payload,
      { secret, headers: { 'x-hub-signature-256': signature } },
    );
  }

  {
    const payload = { update_id: 123456 };
    const secret = 'telegram-secret-token';
    runCommonConnectorTests(
      new TelegramConnector(),
      ChannelTypeEnum.TELEGRAM,
      payload,
      { secret, headers: { 'x-telegram-bot-api-secret-token': secret } },
    );
  }

  {
    const payload = { object: 'page', entry: [{ messaging: [{}] }] };
    const secret = 'facebook-secret';
    const signature = `sha256=${hmacHex(secret, JSON.stringify(payload))}`;
    runCommonConnectorTests(
      new FacebookConnector(),
      ChannelTypeEnum.FACEBOOK,
      payload,
      { secret, headers: { 'x-hub-signature-256': signature } },
    );
  }

  {
    const payload = { object: 'instagram', entry: [{ messaging: [{}] }] };
    const secret = 'instagram-secret';
    const signature = `sha256=${hmacHex(secret, JSON.stringify(payload))}`;
    runCommonConnectorTests(
      new InstagramConnector(),
      ChannelTypeEnum.INSTAGRAM,
      payload,
      { secret, headers: { 'x-hub-signature-256': signature } },
    );
  }

  {
    const payload = { type: 'event_callback', event: {} };
    const secret = 'slack-secret';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = `v0=${hmacHex(secret, `v0:${timestamp}:${JSON.stringify(payload)}`)}`;
    runCommonConnectorTests(new SlackConnector(), ChannelTypeEnum.SLACK, payload, {
      secret,
      headers: {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': timestamp,
      },
    });
  }

  {
    const payload = { type: 'message', text: 'hi' };
    const secret = 'teams-secret';
    const signature = hmacHex(secret, JSON.stringify(payload));
    runCommonConnectorTests(new TeamsConnector(), ChannelTypeEnum.TEAMS, payload, {
      secret,
      signature,
    });
  }

  describe('WebChatConnector specific normalization & formatting', () => {
    const connector = new WebChatConnector();

    it('normalizes correct payload values', async () => {
      const norm1 = await connector.normalizeMessage(tenantId, channelId, {
        id: 'm1',
        senderId: 's1',
        text: 'hello',
      });
      expect(norm1.externalMessageId).toBe('m1');
      expect(norm1.senderId).toBe('s1');
      expect(norm1.content).toBe('hello');

      const norm2 = await connector.normalizeMessage(tenantId, channelId, {});
      expect(norm2.externalMessageId).toBeDefined();
      expect(norm2.senderId).toBe('anonymous');
      expect(norm2.content).toBe('');
    });

    it('formats correct outgoing values', async () => {
      const format1 = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(format1.text).toBe('hello');
      expect(format1.id).toBeDefined();

      const format2 = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { text: 'custom' },
      );
      expect(format2.text).toBe('custom');
    });
  });

  describe('EmailConnector specific normalization & formatting', () => {
    const connector = new EmailConnector();

    it('normalizes email payloads', async () => {
      const norm1 = await connector.normalizeMessage(tenantId, channelId, {
        messageId: 'e1',
        from: 'sender@mail.com',
        text: 'email body',
      });
      expect(norm1.externalMessageId).toBe('e1');
      expect(norm1.senderId).toBe('sender@mail.com');
      expect(norm1.content).toBe('email body');

      const norm2 = await connector.normalizeMessage(tenantId, channelId, {
        subject: 'subject only',
      });
      expect(norm2.content).toBe('subject only');
      expect(norm2.senderId).toBe('');
    });

    it('formats outgoing email', async () => {
      const format1 = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(format1.text).toBe('hello');
      expect(format1.subject).toBe('Support Notification');

      const format2 = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { to: 'user@test.com', subject: 'Custom', text: 'content' },
      );
      expect(format2.to).toBe('user@test.com');
      expect(format2.subject).toBe('Custom');
      expect(format2.text).toBe('content');
    });

    it('validates email webhook headers', async () => {
      const isValid = await connector.validateWebhook(
        tenantId,
        channelId,
        [{ event: 'delivered' }],
        { 'x-sendgrid-signature': 'sig' },
      );
      expect(isValid).toBe(true);
    });
  });

  describe('WhatsAppConnector specific normalization & formatting', () => {
    const connector = new WhatsAppConnector();

    it('normalizes webhook payload', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    { id: 'wa1', from: '12345', text: { body: 'hello wa' } },
                  ],
                },
              },
            ],
          },
        ],
      };
      const norm = await connector.normalizeMessage(
        tenantId,
        channelId,
        payload,
      );
      expect(norm.externalMessageId).toBe('wa1');
      expect(norm.senderId).toBe('12345');
      expect(norm.content).toBe('hello wa');

      const emptyNorm = await connector.normalizeMessage(
        tenantId,
        channelId,
        {},
      );
      expect(emptyNorm.externalMessageId).toBeDefined();
      expect(emptyNorm.senderId).toBe('unknown-wa-user');
      expect(emptyNorm.content).toBe('');
    });

    it('formats WhatsApp message', async () => {
      const formatted = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello string',
      );
      expect(formatted.text.body).toBe('hello string');

      const formattedObj = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { to: '123', text: 'hello obj', type: 'text' },
      );
      expect(formattedObj.to).toBe('123');
      expect(formattedObj.text.body).toBe('hello obj');
    });

    it('validates webhook headers', async () => {
      const isValid = await connector.validateWebhook(
        tenantId,
        channelId,
        { entry: [{ changes: [] }] },
        { 'x-hub-signature-256': 'sig' },
      );
      expect(isValid).toBe(true);
    });
  });

  describe('TelegramConnector specific normalization & formatting', () => {
    const connector = new TelegramConnector();

    it('normalizes telegram update', async () => {
      const payload = {
        message: {
          message_id: 999,
          from: { id: 777 },
          text: 'hello tele',
        },
      };
      const norm = await connector.normalizeMessage(
        tenantId,
        channelId,
        payload,
      );
      expect(norm.externalMessageId).toBe('999');
      expect(norm.senderId).toBe('777');
      expect(norm.content).toBe('hello tele');

      const empty = await connector.normalizeMessage(tenantId, channelId, {});
      expect(empty.senderId).toBe('');
      expect(empty.content).toBe('');
    });

    it('formats telegram message', async () => {
      const formatted = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(formatted.text).toBe('hello');

      const formattedObj = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { chatId: '555', text: 'custom' },
      );
      expect(formattedObj.chat_id).toBe('555');
      expect(formattedObj.text).toBe('custom');
    });
  });

  describe('FacebookConnector specific normalization & formatting', () => {
    const connector = new FacebookConnector();

    it('normalizes fb message', async () => {
      const payload = {
        entry: [
          {
            messaging: [
              {
                message: { mid: 'fb_mid', text: 'hello fb' },
                sender: { id: 'fb_sender' },
              },
            ],
          },
        ],
      };
      const norm = await connector.normalizeMessage(
        tenantId,
        channelId,
        payload,
      );
      expect(norm.externalMessageId).toBe('fb_mid');
      expect(norm.senderId).toBe('fb_sender');
      expect(norm.content).toBe('hello fb');

      const empty = await connector.normalizeMessage(tenantId, channelId, {});
      expect(empty.senderId).toBe('');
    });

    it('formats fb message', async () => {
      const formatted = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(formatted.message.text).toBe('hello');

      const formattedObj = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { recipientId: 'fb1', text: 'custom' },
      );
      expect(formattedObj.recipient.id).toBe('fb1');
      expect(formattedObj.message.text).toBe('custom');
    });
  });

  describe('InstagramConnector specific normalization & formatting', () => {
    const connector = new InstagramConnector();

    it('normalizes ig message', async () => {
      const payload = {
        entry: [
          {
            messaging: [
              {
                message: { mid: 'ig_mid', text: 'hello ig' },
                sender: { id: 'ig_sender' },
              },
            ],
          },
        ],
      };
      const norm = await connector.normalizeMessage(
        tenantId,
        channelId,
        payload,
      );
      expect(norm.externalMessageId).toBe('ig_mid');
      expect(norm.senderId).toBe('ig_sender');
      expect(norm.content).toBe('hello ig');

      const empty = await connector.normalizeMessage(tenantId, channelId, {});
      expect(empty.senderId).toBe('');
    });

    it('formats ig message', async () => {
      const formatted = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(formatted.message.text).toBe('hello');

      const formattedObj = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { recipientId: 'ig1', text: 'custom' },
      );
      expect(formattedObj.recipient.id).toBe('ig1');
    });
  });

  describe('SlackConnector specific normalization & formatting', () => {
    const connector = new SlackConnector();

    it('normalizes slack message', async () => {
      const payload = {
        event: {
          client_msg_id: 'slack_id',
          user: 'slack_user',
          text: 'hello slack',
        },
      };
      const norm = await connector.normalizeMessage(
        tenantId,
        channelId,
        payload,
      );
      expect(norm.externalMessageId).toBe('slack_id');
      expect(norm.senderId).toBe('slack_user');
      expect(norm.content).toBe('hello slack');

      const empty = await connector.normalizeMessage(tenantId, channelId, {});
      expect(empty.senderId).toBe('');
    });

    it('formats slack message', async () => {
      const formatted = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(formatted.text).toBe('hello');

      const formattedObj = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        { channelId: 'c1', text: 'custom', blocks: [] },
      );
      expect(formattedObj.channel).toBe('c1');
      expect(formattedObj.text).toBe('custom');
      expect(formattedObj.blocks).toBeDefined();
    });
  });

  describe('TeamsConnector specific normalization & formatting', () => {
    const connector = new TeamsConnector();

    it('normalizes teams message', async () => {
      const payload = {
        id: 'teams_id',
        from: { id: 'teams_sender' },
        text: 'hello teams',
      };
      const norm = await connector.normalizeMessage(
        tenantId,
        channelId,
        payload,
      );
      expect(norm.externalMessageId).toBe('teams_id');
      expect(norm.senderId).toBe('teams_sender');
      expect(norm.content).toBe('hello teams');

      const empty = await connector.normalizeMessage(tenantId, channelId, {});
      expect(empty.senderId).toBe('');
    });

    it('formats teams message', async () => {
      const formatted = await connector.formatOutgoingMessage(
        tenantId,
        channelId,
        'hello',
      );
      expect(formatted.text).toBe('hello');
      expect(formatted.type).toBe('message');
    });
  });
});
