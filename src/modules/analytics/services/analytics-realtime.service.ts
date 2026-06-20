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
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { IamIntegrationService } from '../../../integration/iam/iam.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/v1/analytics/realtime',
})
@Injectable()
export class AnalyticsRealtimeService
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsRealtimeService.name);
  private pubClient: Redis;
  private subClient: Redis;
  private isRedisConnected = false;

  constructor(private readonly iamService: IamIntegrationService) {}

  async onModuleInit() {
    this.logger.log('Initializing Redis Pub/Sub for Realtime Analytics');
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
      };

      this.pubClient = new Redis(redisOptions);
      this.subClient = new Redis(redisOptions);

      this.subClient.on('message', (channel, message) => {
        this.handleRedisMessage(channel, message);
      });

      await this.subClient.subscribe('analytics:events');
      this.isRedisConnected = true;
      this.logger.log('Connected to Redis Pub/Sub successfully');
    } catch (err: any) {
      this.logger.error(
        `Failed to connect to Redis Pub/Sub: ${err.message}. Realtime updates will be local only.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers['authorization'];
      if (!token) throw new Error('Unauthorized');

      const { tenantId, userId } =
        await this.iamService.validateTokenAndGetTenant(token);

      client.join(`tenant_${tenantId}`);
      this.logger.log(
        `Client ${client.id} from Tenant ${tenantId} connected to Realtime Analytics`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Realtime Analytics connection rejected: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected from Realtime Analytics: ${client.id}`,
    );
  }

  async publishRealtimeEvent(
    tenantId: string,
    eventName: string,
    payload: any,
  ): Promise<void> {
    const data = JSON.stringify({ tenantId, eventName, payload });
    if (this.isRedisConnected) {
      await this.pubClient.publish('analytics:events', data);
    } else {
      // Local fallback
      this.broadcastToTenant(tenantId, eventName, payload);
    }
  }

  private handleRedisMessage(channel: string, message: string) {
    try {
      const { tenantId, eventName, payload } = JSON.parse(message);
      this.broadcastToTenant(tenantId, eventName, payload);
    } catch (err: any) {
      this.logger.error(
        `Failed to parse Redis Pub/Sub message: ${err.message}`,
      );
    }
  }

  private broadcastToTenant(tenantId: string, eventName: string, payload: any) {
    if (this.server) {
      this.server.to(`tenant_${tenantId}`).emit('metrics_update', {
        event: eventName,
        timestamp: new Date().toISOString(),
        data: payload,
      });
    }
  }

  // Live Metrics methods used by controller / dashboard
  async getLiveCounters(tenantId: string): Promise<any> {
    return {
      activeConversations: Math.floor(Math.random() * 50) + 10,
      activeAgents: Math.floor(Math.random() * 10) + 2,
      queuedTickets: Math.floor(Math.random() * 15) + 1,
    };
  }

  async getLiveSlaMetrics(tenantId: string): Promise<any> {
    return {
      slaBreachRiskCount: Math.floor(Math.random() * 5),
      slaComplianceRate: 94.6,
      averageWaitTimeMs: 120000,
    };
  }

  async getLiveAiMetrics(tenantId: string): Promise<any> {
    return {
      currentAiResolutionRate: 72.3,
      liveRequestRatePerSecond: Math.random() * 5,
      liveAverageResponseTimeMs: 450,
    };
  }
}
