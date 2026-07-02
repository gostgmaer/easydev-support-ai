import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
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
import Redis from 'ioredis';
import { IamIntegrationService } from '../../../integration/iam/iam.service';

interface RealtimeEnvelope {
  tenantId: string;
  event: string;
  payload: any;
}

/**
 * Realtime engine for the agent inbox. Broadcasts conversation, message,
 * assignment, presence, typing and read-receipt updates over Socket.IO. A Redis
 * pub/sub fan-out lets the gateway scale horizontally across worker instances.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/v1/inbox/realtime',
})
@Injectable()
export class InboxRealtimeService
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxRealtimeService.name);
  private pubClient?: Redis;
  private subClient?: Redis;
  private isRedisConnected = false;
  private readonly channel = 'inbox:events';

  constructor(private readonly iamService: IamIntegrationService) {}

  async onModuleInit(): Promise<void> {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        password: process.env.REDIS_PASSWORD,
      };
      this.pubClient = new Redis(redisOptions);
      this.subClient = new Redis(redisOptions);
      this.subClient.on('message', (_channel, message) =>
        this.onRedisMessage(message),
      );
      await this.subClient.subscribe(this.channel);
      this.isRedisConnected = true;
      this.logger.log('Inbox realtime Redis pub/sub connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Inbox realtime Redis unavailable (${message}); broadcasting locally only`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers['authorization'];
      if (!token) throw new Error('Unauthorized');
      const { tenantId, userId } =
        await this.iamService.validateTokenAndGetTenant(token);
      client.data.tenantId = tenantId;
      client.data.userId = userId;
      client.join(`tenant_${tenantId}`);
      client.join(`user_${userId}`);
      this.logger.log(`Agent ${userId} (tenant ${tenantId}) joined inbox`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Inbox realtime connection rejected: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Inbox client disconnected: ${client.id}`);
  }

  /** Publishes an update to all agents of a tenant (Redis-fanned when available). */
  async broadcast(
    tenantId: string,
    event: string,
    payload: any,
  ): Promise<void> {
    const envelope: RealtimeEnvelope = { tenantId, event, payload };
    if (this.isRedisConnected && this.pubClient) {
      await this.pubClient.publish(this.channel, JSON.stringify(envelope));
    } else {
      this.emitToTenant(envelope);
    }
  }

  private onRedisMessage(message: string): void {
    try {
      const envelope = JSON.parse(message) as RealtimeEnvelope;
      this.emitToTenant(envelope);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to parse inbox realtime message: ${m}`);
    }
  }

  private emitToTenant(envelope: RealtimeEnvelope): void {
    if (!this.server) return;
    this.server.to(`tenant_${envelope.tenantId}`).emit(envelope.event, {
      timestamp: new Date().toISOString(),
      data: envelope.payload,
    });
  }

  // Typed broadcast helpers
  async emitConversationUpdate(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'inbox.conversation.updated', payload);
  }
  async emitMessageUpdate(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'inbox.message.updated', payload);
  }
  async emitAssignmentUpdate(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'inbox.assignment.updated', payload);
  }
  async emitPresenceUpdate(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'inbox.presence.updated', payload);
  }
  async emitStatusChange(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'inbox.status.changed', payload);
  }
  async emitCounters(tenantId: string, counters: any): Promise<void> {
    await this.broadcast(tenantId, 'inbox.counters', counters);
  }
  async emitTicketUpdate(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'ticket.updated', payload);
  }
  async emitAiEscalation(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'ai.escalation.updated', payload);
  }
  async emitAiSessionUpdate(tenantId: string, payload: any): Promise<void> {
    await this.broadcast(tenantId, 'ai.session.updated', payload);
  }
  async emitWorkflowExecutionUpdate(
    tenantId: string,
    payload: any,
  ): Promise<void> {
    await this.broadcast(tenantId, 'workflow.execution.updated', payload);
  }

  // Client → server events
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): void {
    const tenantId = client.data.tenantId;
    if (!tenantId) return;
    client.to(`tenant_${tenantId}`).emit('inbox.typing', {
      conversationId: data.conversationId,
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('read-receipt')
  handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): void {
    const tenantId = client.data.tenantId;
    if (!tenantId) return;
    client.to(`tenant_${tenantId}`).emit('inbox.read-receipt', {
      conversationId: data.conversationId,
      userId: client.data.userId,
      readAt: new Date().toISOString(),
    });
  }
}
