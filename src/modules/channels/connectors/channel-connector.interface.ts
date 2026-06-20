import { ChannelTypeEnum } from '../domain/value-objects';

export interface IChannelConnector {
  readonly channelType: ChannelTypeEnum;

  sendMessage(
    tenantId: string,
    channelId: string,
    recipientId: string,
    message: any,
  ): Promise<{ messageId: string; status: 'SENT' | 'FAILED'; error?: string }>;

  sendBulkMessages(
    tenantId: string,
    channelId: string,
    recipientIds: string[],
    message: any,
  ): Promise<
    Array<{
      recipientId: string;
      messageId?: string;
      status: 'SENT' | 'FAILED';
      error?: string;
    }>
  >;

  receiveMessage(
    tenantId: string,
    channelId: string,
    rawPayload: any,
  ): Promise<any>;

  validateWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<boolean>;

  verifySignature(
    tenantId: string,
    channelId: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean>;

  normalizeMessage(
    tenantId: string,
    channelId: string,
    rawMessage: any,
  ): Promise<{
    externalMessageId: string;
    senderId: string;
    content: string;
    rawPayload: any;
  }>;

  formatOutgoingMessage(
    tenantId: string,
    channelId: string,
    message: any,
  ): Promise<any>;

  healthCheck(
    tenantId: string,
    channelId: string,
  ): Promise<{
    status: 'ONLINE' | 'OFFLINE';
    latencyMs: number;
    error?: string;
  }>;

  getCapabilities(): string[];
}
