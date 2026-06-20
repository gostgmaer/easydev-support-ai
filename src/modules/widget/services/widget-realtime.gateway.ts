import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { WidgetSessionService } from './widget-session.service';
import { WidgetEventService } from './widget-event.service';
import { db, schema } from '@easydev/database';
import { and, eq } from 'drizzle-orm';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/v1/widget-chat',
})
export class WidgetRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WidgetRealtimeGateway.name);

  constructor(
    @Inject(forwardRef(() => WidgetSessionService))
    private readonly sessionService: WidgetSessionService,
    private readonly eventService: WidgetEventService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token as string;
      const tenantId = (client.handshake.headers['x-tenant-id'] || client.handshake.query.tenantId) as string;

      if (!token || !tenantId) {
        throw new Error('Missing token or tenantId');
      }

      // Validate session token
      const { visitorId, sessionId } = await this.sessionService.validateSessionToken(tenantId, token);

      // Join tenant, visitor and session rooms
      client.join(`tenant_${tenantId}`);
      client.join(`session_${sessionId}`);
      client.join(`visitor_${visitorId}`);

      // Associate properties to socket client
      client.data = { tenantId, visitorId, sessionId };

      // Update visitor presence (last seen status)
      await db.update(schema.widgetVisitors)
        .set({ lastSeenAt: new Date() })
        .where(eq(schema.widgetVisitors.id, visitorId));

      this.logger.log(`Widget client session ${sessionId} connected for tenant ${tenantId}`);

      // Track connection event
      await this.eventService.trackEvent(tenantId, {
        sessionId,
        eventName: 'CLIENT_CONNECTED',
        eventData: { clientSocketId: client.id },
      });

      // Emit connected status back to client
      client.emit('connected', { sessionId, visitorId });
    } catch (e: any) {
      this.logger.warn(`Widget connection rejected: ${e.message}`);
      client.emit('error', { message: 'Unauthorized connection' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const data = client.data;
    if (data?.tenantId && data?.sessionId) {
      this.logger.log(`Widget client session ${data.sessionId} disconnected`);
      await this.eventService.trackEvent(data.tenantId, {
        sessionId: data.sessionId,
        eventName: 'CLIENT_DISCONNECTED',
      });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { isTyping: boolean; conversationId?: string },
  ) {
    const { tenantId, sessionId, visitorId } = client.data || {};
    if (!tenantId || !sessionId) return;

    // Broadcast typing indicator to tenant agents (e.g. on agent-inbox namespace if we share servers, or broadcast to tenant room)
    this.server.to(`tenant_${tenantId}`).emit('widget.visitor.typing', {
      sessionId,
      visitorId,
      isTyping: body.isTyping,
      conversationId: body.conversationId,
    });
  }

  @SubscribeMessage('read_receipt')
  async handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string; conversationId: string },
  ) {
    const { tenantId, sessionId } = client.data || {};
    if (!tenantId || !sessionId) return;

    // Mark message as read in operational db if applicable
    await db.update(schema.messages)
      .set({ readAt: new Date() })
      .where(and(
        eq(schema.messages.id, body.messageId),
        eq(schema.messages.tenantId, tenantId)
      ));

    // Notify agents
    this.server.to(`tenant_${tenantId}`).emit('widget.message.read', {
      messageId: body.messageId,
      conversationId: body.conversationId,
      sessionId,
    });

    await this.eventService.trackEvent(tenantId, {
      sessionId,
      eventName: 'READ_RECEIPT',
      eventData: { messageId: body.messageId, conversationId: body.conversationId },
    });
  }

  @SubscribeMessage('presence')
  async handlePresence(@ConnectedSocket() client: Socket) {
    const { tenantId, visitorId } = client.data || {};
    if (!tenantId || !visitorId) return;

    await db.update(schema.widgetVisitors)
      .set({ lastSeenAt: new Date() })
      .where(eq(schema.widgetVisitors.id, visitorId));

    client.emit('presence_ack', { timestamp: new Date() });
  }

  @SubscribeMessage('message_sync')
  async handleMessageSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { lastSyncedAt?: string },
  ) {
    const { tenantId, sessionId } = client.data || {};
    if (!tenantId || !sessionId) return;

    // Retrieve active conversations linked to session
    const linkedConvs = await db
      .select()
      .from(schema.widgetConversations)
      .where(and(
        eq(schema.widgetConversations.tenantId, tenantId),
        eq(schema.widgetConversations.widgetSessionId, sessionId)
      ));

    const conversationIds = linkedConvs.map(c => c.conversationId);
    if (conversationIds.length === 0) {
      client.emit('message_sync_response', { messages: [] });
      return;
    }

    // Fetch messages since last sync timestamp or last 50 messages
    let query = db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationIds[0])); // Fetch from first active conversation

    const messages = await query;
    client.emit('message_sync_response', { messages });
  }

  // Helper function to send messages to widget client directly from service layer
  emitToSession(tenantId: string, sessionId: string, eventName: string, payload: any) {
    if (this.server) {
      this.server.to(`session_${sessionId}`).emit(eventName, payload);
    }
  }
}
