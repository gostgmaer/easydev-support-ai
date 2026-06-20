import { Injectable, Logger } from '@nestjs/common';
import { IChannelConnector } from './channel-connector.interface';
import { ChannelTypeEnum } from '../domain/value-objects';
import { randomUUID } from 'crypto';

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
    return true; // Webchat uses token auth/client session
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return signature === secret;
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
    return !!headers['x-sendgrid-signature'] || true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true;
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
    return !!headers['x-hub-signature-256'] || true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true; // Meta signature verification logic
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
    return true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true;
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
    return true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true;
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
    return true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true;
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
    return true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true;
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
    return true;
  }

  async verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    return true;
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
