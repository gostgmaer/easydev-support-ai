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

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[WebChat] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return true; // Webchat uses token auth/client session, not third-party webhooks.
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    if (!signature || !secret) return false;
    return constantTimeEqual(signature, secret);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return {
      externalMessageId: rawMessage.id || randomUUID(),
      senderId: rawMessage.senderId || 'anonymous',
      content: rawMessage.text || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      id: randomUUID(),
      timestamp: new Date(),
      text:
        typeof message === 'string'
          ? message
          : message.text || JSON.stringify(message),
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 1 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'RICH_MEDIA', 'CAROUSELS'];
  }
}

@Injectable()
export class EmailConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.EMAIL;
  private readonly logger = new Logger(EmailConnector.name);

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Email] Sending email to ${recipientId} on tenant ${tenantId}`,
    );
    // SMTP/SendGrid implementation structure
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    // SendGrid's Event Webhook posts a JSON array of event objects.
    return Array.isArray(payload);
  }

  async verifySignature(
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
    if (!secret || !sigHeader) return false;
    const expected = hmacSha256Hex(secret, bodyToBuffer(payload, rawBody));
    return constantTimeEqual(sigHeader, expected);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return {
      externalMessageId: rawMessage.messageId || randomUUID(),
      senderId: rawMessage.from || '',
      content: rawMessage.text || rawMessage.subject || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      to: message.to,
      subject: message.subject || 'Support Notification',
      text: typeof message === 'string' ? message : message.text,
      html: message.html,
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 5 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'HTML', 'ATTACHMENTS'];
  }
}

@Injectable()
export class WhatsAppConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.WHATSAPP;
  private readonly logger = new Logger(WhatsAppConnector.name);

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[WhatsApp] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return Array.isArray(payload?.entry);
  }

  async verifySignature(
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
    if (!secret || !sigHeader) return false;
    const expected = `sha256=${hmacSha256Hex(secret, bodyToBuffer(payload, rawBody))}`;
    return constantTimeEqual(sigHeader, expected);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const entry = rawMessage.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    return {
      externalMessageId: message?.id || randomUUID(),
      senderId: message?.from || 'unknown-wa-user',
      content: message?.text?.body || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
      type: message.type || 'text',
      text: { body: typeof message === 'string' ? message : message.text },
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 10 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'TEMPLATES', 'MEDIA', 'INTERACTIVE'];
  }
}

@Injectable()
export class TelegramConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.TELEGRAM;
  private readonly logger = new Logger(TelegramConnector.name);

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Telegram] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return typeof payload?.update_id === 'number';
  }

  async verifySignature(
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
    if (!secret || !token) return false;
    return constantTimeEqual(token, secret);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return {
      externalMessageId: String(rawMessage.message?.message_id || randomUUID()),
      senderId: String(rawMessage.message?.from?.id || ''),
      content: rawMessage.message?.text || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      chat_id: message.chatId,
      text: typeof message === 'string' ? message : message.text,
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 8 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'INLINE_KEYBOARDS', 'MEDIA'];
  }
}

@Injectable()
export class FacebookConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.FACEBOOK;
  private readonly logger = new Logger(FacebookConnector.name);

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Facebook] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return payload?.object === 'page' && Array.isArray(payload?.entry);
  }

  async verifySignature(
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
    if (!secret || !sigHeader) return false;
    const expected = `sha256=${hmacSha256Hex(secret, bodyToBuffer(payload, rawBody))}`;
    return constantTimeEqual(sigHeader, expected);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const entry = rawMessage.entry?.[0];
    const messaging = entry?.messaging?.[0];
    return {
      externalMessageId: messaging?.message?.mid || randomUUID(),
      senderId: messaging?.sender?.id || '',
      content: messaging?.message?.text || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      recipient: { id: message.recipientId },
      message: { text: typeof message === 'string' ? message : message.text },
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 12 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'TEMPLATES', 'ATTACHMENTS'];
  }
}

@Injectable()
export class InstagramConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.INSTAGRAM;
  private readonly logger = new Logger(InstagramConnector.name);

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Instagram] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return payload?.object === 'instagram' && Array.isArray(payload?.entry);
  }

  async verifySignature(
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
    if (!secret || !sigHeader) return false;
    const expected = `sha256=${hmacSha256Hex(secret, bodyToBuffer(payload, rawBody))}`;
    return constantTimeEqual(sigHeader, expected);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const entry = rawMessage.entry?.[0];
    const messaging = entry?.messaging?.[0];
    return {
      externalMessageId: messaging?.message?.mid || randomUUID(),
      senderId: messaging?.sender?.id || '',
      content: messaging?.message?.text || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      recipient: { id: message.recipientId },
      message: { text: typeof message === 'string' ? message : message.text },
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 15 };
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

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Slack] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return typeof payload?.type === 'string';
  }

  async verifySignature(
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
    if (!secret || !sigHeader || !timestamp) return false;

    const ts = parseInt(timestamp, 10);
    if (
      !Number.isFinite(ts) ||
      Math.abs(Date.now() / 1000 - ts) > this.signatureValidityWindowSeconds
    ) {
      return false;
    }

    const body = bodyToBuffer(payload, rawBody).toString('utf8');
    const expected = `v0=${hmacSha256Hex(secret, `v0:${timestamp}:${body}`)}`;
    return constantTimeEqual(sigHeader, expected);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    const event = rawMessage.event;
    return {
      externalMessageId: event?.client_msg_id || randomUUID(),
      senderId: event?.user || '',
      content: event?.text || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      channel: message.channelId,
      text: typeof message === 'string' ? message : message.text,
      blocks: message.blocks,
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 7 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'BLOCK_KIT', 'ATTACHMENTS'];
  }
}

@Injectable()
export class TeamsConnector implements IChannelConnector {
  readonly channelType = ChannelTypeEnum.TEAMS;
  private readonly logger = new Logger(TeamsConnector.name);

  async sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<any> {
    this.logger.log(
      `[Teams] Sending message to ${recipientId} on tenant ${tenantId}`,
    );
    return { messageId: randomUUID(), status: 'SENT' };
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

  async receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any> {
    return rawPayload;
  }

  async validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean> {
    return typeof payload?.type === 'string';
  }

  async verifySignature(
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
    // enforced rather than bypassed outright.
    if (!secret || !signature) return false;
    const expected = hmacSha256Hex(secret, bodyToBuffer(payload, rawBody));
    return constantTimeEqual(signature, expected);
  }

  async normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<any> {
    return {
      externalMessageId: rawMessage.id || randomUUID(),
      senderId: rawMessage.from?.id || '',
      content: rawMessage.text || '',
      rawPayload: rawMessage,
    };
  }

  async formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any> {
    return {
      type: 'message',
      text: typeof message === 'string' ? message : message.text,
    };
  }

  async healthCheck(tenantId: string, channelId: string): Promise<any> {
    return { status: 'ONLINE', latencyMs: 9 };
  }

  getCapabilities(): string[] {
    return ['TEXT', 'CARDS'];
  }
}
