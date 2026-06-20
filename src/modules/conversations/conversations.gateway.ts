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
import { Logger } from '@nestjs/common';
import { IamIntegrationService } from '../../integration/iam/iam.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
  namespace: '/v1/agent-inbox',
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationsGateway.name);

  constructor(private readonly iamService: IamIntegrationService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers['authorization'];
      if (!token) throw new Error('Unauthorized');

      // Authenticate via IAM
      const { tenantId, userId } =
        await this.iamService.validateTokenAndGetTenant(token);

      // Join a tenant-specific room so agents only see their tenant's events
      const tenantRoom = `tenant_${tenantId}`;
      client.join(tenantRoom);

      // Optionally join a user-specific room for direct notifications
      client.join(`user_${userId}`);

      this.logger.log(
        `Agent ${userId} from tenant ${tenantId} connected to inbox.`,
      );
    } catch (e) {
      this.logger.warn(`Connection rejected: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Method to be called by the BullMQ processor to push new messages to the UI
  broadcastNewMessage(tenantId: string, payload: any) {
    this.server.to(`tenant_${tenantId}`).emit('newMessage', payload);
  }

  // Allow agents to send typing indicators
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast to the specific conversation room if we implement conversation-level rooms
    client.broadcast.to(Array.from(client.rooms)).emit('typingIndicator', data);
  }
}
