import { Injectable, Logger } from '@nestjs/common';
import { WidgetRealtimeGateway } from './widget-realtime.gateway';

@Injectable()
export class WidgetRealtimeService {
  private readonly logger = new Logger(WidgetRealtimeService.name);

  constructor(private readonly gateway: WidgetRealtimeGateway) {}

  sendNewMessage(
    tenantId: string,
    sessionId: string,
    messagePayload: any,
  ): Promise<void> {
    this.logger.log(`Broadcasting new message to widget session: ${sessionId}`);
    this.gateway.emitToSession(
      tenantId,
      sessionId,
      'newMessage',
      messagePayload,
    );
    return Promise.resolve();
  }

  sendPresenceUpdate(
    tenantId: string,
    sessionId: string,
    presencePayload: any,
  ): Promise<void> {
    this.gateway.emitToSession(
      tenantId,
      sessionId,
      'presence.update',
      presencePayload,
    );
    return Promise.resolve();
  }

  sendTypingIndicator(
    tenantId: string,
    sessionId: string,
    typingPayload: { isTyping: boolean },
  ): Promise<void> {
    this.gateway.emitToSession(
      tenantId,
      sessionId,
      'typing.indicator',
      typingPayload,
    );
    return Promise.resolve();
  }
}
