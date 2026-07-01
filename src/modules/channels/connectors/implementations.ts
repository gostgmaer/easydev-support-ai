import { Injectable, Logger } from '@nestjs/common';
import { IChannelConnector } from './channel-connector.interface';
import { ChannelTypeEnum } from '../domain/value-objects';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';

function bodyToBuffer(payload: any, rawBody?: string | Buffer): Buffer {
  if (rawBody) return Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  return Buffer.from(
    typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}),
  );
}

function hmacSha256Hex(secret: string, data: string | Buffer): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class WebChatConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.WEBCHAT;
  private readonly logger = new Logger(WebChatConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[WebChat] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(): Promise<boolean> {
    // Webchat uses token auth/client session, not third-party webhooks.
    return Promise.resolve(true);
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    if (!signature || !secret) return Promise.resolve(false);
    return Promise.resolve(constantTimeEqual(signature, secret));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return Promise.resolve({
      externalMessageId: rawMessage.id || randomUUID(),
      senderId: rawMessage.senderId || 'anonymous',
      content: rawMessage.text || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      id: randomUUID(),
      timestamp: new Date(),
      text:
        typeof message === 'string'
          ? message
          : message.text || JSON.stringify(message),
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 1 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'RICH_MEDIA', 'CAROUSELS'];
  }
}

@Injectable()
export class EmailConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.EMAIL;
  private readonly logger = new Logger(EmailConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Email] Sending email to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    // SMTP/SendGrid implementation structure
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    // SendGrid's Event Webhook posts a JSON array of event objects.
    return Promise.resolve(Array.isArray(payload));
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
    rawBody?: string | Buffer,
  ): Promise<boolean> {
    // SendGrid's native Event Webhook signing is ECDSA against a per-account public
    // key, which this shared-secret interface can't express. Fall back to a generic
    // HMAC-SHA256 check so a configured secret is still enforced rather than bypassed.
    const sigHeader = headers['x-sendgrid-signature'] || signature;
    if (!secret || !sigHeader) return Promise.resolve(false);
    const expected = hmacSha256Hex(secret, bodyToBuffer(payload, rawBody));
    return Promise.resolve(constantTimeEqual(sigHeader, expected));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return Promise.resolve({
      externalMessageId: rawMessage.messageId || randomUUID(),
      senderId: rawMessage.from || '',
      content: rawMessage.text || rawMessage.subject || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      to: message.to,
      subject: message.subject || 'Support Notification',
      text: typeof message === 'string' ? message : message.text,
      html: message.html,
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 5 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'HTML', 'ATTACHMENTS'];
  }
}

@Injectable()
export class WhatsAppConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.WHATSAPP;
  private readonly logger = new Logger(WhatsAppConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[WhatsApp] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    return Promise.resolve(Array.isArray(payload?.entry));
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
    rawBody?: string | Buffer,
  ): Promise<boolean> {
    // Meta's webhook signing scheme (shared by WhatsApp/Facebook/Instagram):
    // X-Hub-Signature-256: sha256=<hmac-sha256(app secret, raw body)>
    const sigHeader = headers['x-hub-signature-256'] || signature;
    if (!secret || !sigHeader) return Promise.resolve(false);
    const expected = `sha256=${hmacSha256Hex(secret, bodyToBuffer(payload, rawBody))}`;
    return Promise.resolve(constantTimeEqual(sigHeader, expected));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const entry = rawMessage.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    return Promise.resolve({
      externalMessageId: message?.id || randomUUID(),
      senderId: message?.from || 'unknown-wa-user',
      content: message?.text?.body || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: message.type || 'text',
      text: { body: typeof message === 'string' ? message : message.text },
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 10 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'TEMPLATES', 'MEDIA', 'INTERACTIVE'];
  }
}

@Injectable()
export class TelegramConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.TELEGRAM;
  private readonly logger = new Logger(TelegramConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Telegram] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    return Promise.resolve(typeof payload?.update_id === 'number');
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
  ): Promise<boolean> {
    // Telegram has no payload signature; it echoes back a static secret token
    // (set via setWebhook's secret_token) in X-Telegram-Bot-Api-Secret-Token.
    const token = headers['x-telegram-bot-api-secret-token'] || signature;
    if (!secret || !token) return Promise.resolve(false);
    return Promise.resolve(constantTimeEqual(token, secret));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return Promise.resolve({
      externalMessageId: String(rawMessage.message?.message_id || randomUUID()),
      senderId: String(rawMessage.message?.from?.id || ''),
      content: rawMessage.message?.text || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      chat_id: message.chatId,
      text: typeof message === 'string' ? message : message.text,
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 8 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'INLINE_KEYBOARDS', 'MEDIA'];
  }
}

@Injectable()
export class FacebookConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.FACEBOOK;
  private readonly logger = new Logger(FacebookConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Facebook] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    return Promise.resolve(
      payload?.object === 'page' && Array.isArray(payload?.entry),
    );
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
    rawBody?: string | Buffer,
  ): Promise<boolean> {
    // Same Meta webhook signing scheme as WhatsApp.
    const sigHeader = headers['x-hub-signature-256'] || signature;
    if (!secret || !sigHeader) return Promise.resolve(false);
    const expected = `sha256=${hmacSha256Hex(secret, bodyToBuffer(payload, rawBody))}`;
    return Promise.resolve(constantTimeEqual(sigHeader, expected));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const entry = rawMessage.entry?.[0];
    const messaging = entry?.messaging?.[0];
    return Promise.resolve({
      externalMessageId: messaging?.message?.mid || randomUUID(),
      senderId: messaging?.sender?.id || '',
      content: messaging?.message?.text || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      recipient: { id: message.recipientId },
      message: { text: typeof message === 'string' ? message : message.text },
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 12 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'TEMPLATES', 'ATTACHMENTS'];
  }
}

@Injectable()
export class InstagramConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.INSTAGRAM;
  private readonly logger = new Logger(InstagramConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Instagram] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    return Promise.resolve(
      payload?.object === 'instagram' && Array.isArray(payload?.entry),
    );
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
    rawBody?: string | Buffer,
  ): Promise<boolean> {
    // Same Meta webhook signing scheme as WhatsApp/Facebook.
    const sigHeader = headers['x-hub-signature-256'] || signature;
    if (!secret || !sigHeader) return Promise.resolve(false);
    const expected = `sha256=${hmacSha256Hex(secret, bodyToBuffer(payload, rawBody))}`;
    return Promise.resolve(constantTimeEqual(sigHeader, expected));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const entry = rawMessage.entry?.[0];
    const messaging = entry?.messaging?.[0];
    return Promise.resolve({
      externalMessageId: messaging?.message?.mid || randomUUID(),
      senderId: messaging?.sender?.id || '',
      content: messaging?.message?.text || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      recipient: { id: message.recipientId },
      message: { text: typeof message === 'string' ? message : message.text },
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 15 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'STORY_REPLIES'];
  }
}

@Injectable()
export class SlackConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.SLACK;
  private readonly logger = new Logger(SlackConnector.name);
  private readonly signatureValidityWindowSeconds = 300;

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Slack] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    return Promise.resolve(typeof payload?.type === 'string');
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
    rawBody?: string | Buffer,
  ): Promise<boolean> {
    // Slack signing scheme: X-Slack-Signature: v0=<hmac-sha256(signing secret, "v0:{ts}:{body}")>,
    // with a timestamp freshness check to guard against replay.
    const sigHeader = headers['x-slack-signature'] || signature;
    const timestamp = headers['x-slack-request-timestamp'];
    if (!secret || !sigHeader || !timestamp) return Promise.resolve(false);

    const ts = parseInt(timestamp, 10);
    if (
      !Number.isFinite(ts) ||
      Math.abs(Date.now() / 1000 - ts) > this.signatureValidityWindowSeconds
    ) {
      return Promise.resolve(false);
    }

    const body = bodyToBuffer(payload, rawBody).toString('utf8');
    const expected = `v0=${hmacSha256Hex(secret, `v0:${timestamp}:${body}`)}`;
    return Promise.resolve(constantTimeEqual(sigHeader, expected));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const event = rawMessage.event;
    return Promise.resolve({
      externalMessageId: event?.client_msg_id || randomUUID(),
      senderId: event?.user || '',
      content: event?.text || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      channel: message.channelId,
      text: typeof message === 'string' ? message : message.text,
      blocks: message.blocks,
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 7 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'BLOCK_KIT', 'ATTACHMENTS'];
  }
}

@Injectable()
export class TeamsConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.TEAMS;
  private readonly logger = new Logger(TeamsConnector.name);

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Teams] Sending message to ${recipientId} on tenant ${tenantId}: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );
    return Promise.resolve({ messageId: randomUUID(), status: 'SENT' });
  }

  async sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<any[]> {
    return Promise.all(
      recipientIds.map((id) =>
        this.sendMessage(tenantId, channelId, id, message).then((r) => ({
          recipientId: id,
          ...r,
        })),
      ),
    );
  }

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return Promise.resolve(rawPayload);
  }

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
  ): Promise<boolean> {
    return Promise.resolve(typeof payload?.type === 'string');
  }

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
    headers: Record<string, any> = {},
    rawBody?: string | Buffer,
  ): Promise<boolean> {
    // Teams/Bot Framework natively authenticates via a JWT bearer token validated
    // against Microsoft's JWKS, which this shared-secret interface can't express.
    // Fall back to a generic HMAC-SHA256 check so a configured secret is still
    // enforced rather than bypassed outright. Bot Framework doesn't send a static
    // signature header, so `headers` is logged for audit purposes only.
    this.logger.debug(
      `[Teams] verifySignature headers present: ${Object.keys(headers).join(', ') || 'none'}`,
    );
    if (!secret || !signature) return Promise.resolve(false);
    const expected = hmacSha256Hex(secret, bodyToBuffer(payload, rawBody));
    return Promise.resolve(constantTimeEqual(signature, expected));
  }

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return Promise.resolve({
      externalMessageId: rawMessage.id || randomUUID(),
      senderId: rawMessage.from?.id || '',
      content: rawMessage.text || '',
      rawPayload: rawMessage,
    });
  }

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return Promise.resolve({
      type: 'message',
      text: typeof message === 'string' ? message : message.text,
    });
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({ status: 'ONLINE', latencyMs: 9 });
  }

  getCapabilities(): string[] {
    return ['TEXT', 'CARDS'];
  }
}
