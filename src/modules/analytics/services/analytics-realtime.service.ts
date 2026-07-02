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
import { db, schema } from '@easydev/database';
import { and, eq, gte, lte, notInArray, isNotNull, sql } from 'drizzle-orm';
import { IamIntegrationService } from '../../../integration/iam/iam.service';
import { getAllowedOrigins } from '../../../config/cors-origins';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
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
        password: process.env.REDIS_PASSWORD,
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

      const { tenantId } =
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

  private async getCachedOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    if (this.isRedisConnected && this.pubClient) {
      try {
        const cached = await this.pubClient.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (err: any) {
        this.logger.warn(`Redis get error for ${key}: ${err.message}`);
      }
    }

    const data = await fetchFn();

    if (this.isRedisConnected && this.pubClient) {
      try {
        await this.pubClient.setex(key, ttlSeconds, JSON.stringify(data));
      } catch (err: any) {
        this.logger.warn(`Redis setex error for ${key}: ${err.message}`);
      }
    }

    return data;
  }

  // Live Metrics methods used by controller / dashboard.
  // Cached in Redis to prevent heavy DB aggregates on every poll.
  async getLiveCounters(tenantId: string): Promise<any> {
    return this.getCachedOrFetch(
      `analytics:live:counters:${tenantId}`,
      15,
      async () => {
        const [conversationsRow] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.tenantId, tenantId),
              notInArray(schema.conversations.status, ['CLOSED', 'ARCHIVED']),
            ),
          );

        const [ticketsRow] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(schema.tickets)
          .where(
            and(
              eq(schema.tickets.tenantId, tenantId),
              eq(schema.tickets.status, 'OPEN'),
            ),
          );

        const [presenceRow] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(schema.inboxPresence)
          .where(
            and(
              eq(schema.inboxPresence.tenantId, tenantId),
              sql`${schema.inboxPresence.status} IN ('ONLINE', 'AWAY', 'BUSY')`,
            ),
          );

        return {
          activeConversations: conversationsRow?.count ?? 0,
          activeAgents: presenceRow?.count ?? 0,
          queuedTickets: ticketsRow?.count ?? 0,
        };
      },
    );
  }

  async getLiveSlaMetrics(tenantId: string): Promise<any> {
    return this.getCachedOrFetch(
      `analytics:live:sla:${tenantId}`,
      15,
      async () => {
        const now = new Date();
        const riskWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);

        const [riskRow] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(schema.ticketSla)
          .where(
            and(
              eq(schema.ticketSla.tenantId, tenantId),
              eq(schema.ticketSla.breached, false),
              gte(schema.ticketSla.resolutionDueAt, now),
              lte(schema.ticketSla.resolutionDueAt, riskWindowEnd),
            ),
          );

        // Compliance over SLAs whose deadline has already passed (the outcome is
        // settled - breached is final) in the last 30 days, not all-time, so the
        // rate reflects current operations rather than ancient history.
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [complianceRow] = await db
          .select({
            total: sql<number>`cast(count(*) as int)`,
            compliant: sql<number>`cast(count(*) filter (where ${schema.ticketSla.breached} = false) as int)`,
          })
          .from(schema.ticketSla)
          .where(
            and(
              eq(schema.ticketSla.tenantId, tenantId),
              lte(schema.ticketSla.resolutionDueAt, now),
              gte(schema.ticketSla.resolutionDueAt, last30Days),
            ),
          );

        const [waitTimeRow] = await db
          .select({
            avgMs: sql<number>`cast(avg(extract(epoch from (${schema.tickets.firstResponseAt} - ${schema.tickets.createdAt})) * 1000) as int)`,
          })
          .from(schema.tickets)
          .where(
            and(
              eq(schema.tickets.tenantId, tenantId),
              isNotNull(schema.tickets.firstResponseAt),
              gte(schema.tickets.createdAt, last30Days),
            ),
          );

        return {
          slaBreachRiskCount: riskRow?.count ?? 0,
          slaComplianceRate:
            complianceRow?.total && complianceRow.total > 0
              ? Math.round(
                  (complianceRow.compliant / complianceRow.total) * 1000,
                ) / 10
              : null,
          averageWaitTimeMs: waitTimeRow?.avgMs ?? null,
        };
      },
    );
  }

  async getLiveAiMetrics(tenantId: string): Promise<any> {
    return this.getCachedOrFetch(
      `analytics:live:ai:${tenantId}`,
      15,
      async () => {
        const today = new Date().toISOString().slice(0, 10);
        const [usageRow] = await db
          .select({
            requests: sql<number>`cast(coalesce(sum(${schema.aiUsageMetrics.requests}), 0) as int)`,
          })
          .from(schema.aiUsageMetrics)
          .where(
            and(
              eq(schema.aiUsageMetrics.tenantId, tenantId),
              eq(schema.aiUsageMetrics.date, today),
            ),
          );

        const now = new Date();
        const secondsSinceMidnight =
          (now.getTime() -
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            ).getTime()) /
          1000;

        return {
          // currentAiResolutionRate and liveAverageResponseTimeMs would need a
          // stored "resolved by AI without human takeover" signal and per-call
          // latency respectively - neither exists in the data model today, so
          // they're omitted rather than faked.
          currentAiResolutionRate: null,
          liveRequestRatePerSecond:
            secondsSinceMidnight > 0
              ? Math.round(
                  ((usageRow?.requests ?? 0) / secondsSinceMidnight) * 1000,
                ) / 1000
              : 0,
          liveAverageResponseTimeMs: null,
        };
      },
    );
  }
}
