import {
  Injectable,
  Inject,
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
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { getAllowedOrigins } from '../../../config/cors-origins';
import { db } from '@easydev/database';
import {
  QUEUES,
  QueueName,
  DeadLetterPayload,
  QueueService,
} from '@easydev/shared-queues';
import type { IAdminRepository } from '../repositories/admin-repository.interface';
import { SystemHealth } from '../domain/system-health.entity';
import {
  SystemHealthStatusEnum,
  IncidentSeverityEnum,
} from '../domain/value-objects';
import { AdminEventPublisher } from './admin-event.publisher';
import { SystemHealthChangedEvent } from '@easydev/shared-events';
import { ConnectorHealthService } from '../../connectors/services/connector-health.service';
import { ConnectorService } from '../../connectors/services/connector.service';
import { WorkflowExecutionService } from '../../workflows/services/workflow-execution.service';
import { IamIntegrationService } from '../../../integration/iam/iam.service';

interface RealtimeEnvelope {
  tenantId: string;
  event: string;
  payload: any;
}

export interface QueueStats {
  name: QueueName;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

const MONITORED_SERVICES = [
  'database',
  'redis',
  'connector-engine',
  'workflow-engine',
];

@WebSocketGateway({
  cors: { origin: getAllowedOrigins() },
  namespace: '/v1/admin/health',
})
@Injectable()
export class AdminHealthService
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminHealthService.name);
  private pubClient?: Redis;
  private subClient?: Redis;
  private isRedisConnected = false;
  private readonly channel = 'admin:health:events';

  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    private readonly eventPublisher: AdminEventPublisher,
    private readonly moduleRef: ModuleRef,
    private readonly queueService: QueueService,
    private readonly connectorHealthService: ConnectorHealthService,
    private readonly connectorService: ConnectorService,
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly iamService: IamIntegrationService,
  ) {}

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
      this.logger.log('Admin health realtime Redis pub/sub connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Admin health realtime Redis unavailable (${message}); broadcasting locally only`,
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
      this.logger.log(
        `Admin ${userId} (tenant ${tenantId}) joined health channel`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Admin health realtime connection rejected: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Admin health client disconnected: ${client.id}`);
  }

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
      this.logger.error(`Failed to parse admin health realtime message: ${m}`);
    }
  }

  private emitToTenant(envelope: RealtimeEnvelope): void {
    if (!this.server) return;
    this.server.to(`tenant_${envelope.tenantId}`).emit(envelope.event, {
      timestamp: new Date().toISOString(),
      data: envelope.payload,
    });
  }

  // ---- System health probes ----

  private async checkDatabase(): Promise<{
    status: SystemHealthStatusEnum;
    latencyMs: number;
    errorRate: number;
  }> {
    const start = Date.now();
    try {
      await db.execute(sql`select 1`);
      return {
        status: SystemHealthStatusEnum.HEALTHY,
        latencyMs: Date.now() - start,
        errorRate: 0,
      };
    } catch {
      return {
        status: SystemHealthStatusEnum.DOWN,
        latencyMs: Date.now() - start,
        errorRate: 1,
      };
    }
  }

  private async checkRedis(): Promise<{
    status: SystemHealthStatusEnum;
    latencyMs: number;
    errorRate: number;
  }> {
    const start = Date.now();
    try {
      if (!this.pubClient) throw new Error('Redis client not initialized');
      await this.pubClient.ping();
      return {
        status: SystemHealthStatusEnum.HEALTHY,
        latencyMs: Date.now() - start,
        errorRate: 0,
      };
    } catch {
      return {
        status: SystemHealthStatusEnum.DOWN,
        latencyMs: Date.now() - start,
        errorRate: 1,
      };
    }
  }

  private async checkConnectorEngine(tenantId: string): Promise<{
    status: SystemHealthStatusEnum;
    latencyMs: number;
    errorRate: number;
  }> {
    const start = Date.now();
    const [total, unhealthy] = await Promise.all([
      this.connectorService.getConnectors(tenantId, { limit: 1 }),
      this.connectorService.getConnectors(tenantId, {
        limit: 1,
        healthStatus: 'UNHEALTHY',
      }),
    ]);
    const latencyMs = Date.now() - start;
    if (total.total === 0)
      return {
        status: SystemHealthStatusEnum.HEALTHY,
        latencyMs,
        errorRate: 0,
      };
    const errorRate = unhealthy.total / total.total;
    const status =
      errorRate === 0
        ? SystemHealthStatusEnum.HEALTHY
        : errorRate >= 0.5
          ? SystemHealthStatusEnum.DOWN
          : SystemHealthStatusEnum.DEGRADED;
    return { status, latencyMs, errorRate };
  }

  private async checkWorkflowEngine(tenantId: string): Promise<{
    status: SystemHealthStatusEnum;
    latencyMs: number;
    errorRate: number;
  }> {
    const start = Date.now();
    const [failed, active] = await Promise.all([
      this.workflowExecutionService.findExecutions(tenantId, {
        status: 'FAILED',
      }),
      this.workflowExecutionService.findExecutions(tenantId, {
        status: 'ACTIVE',
      }),
    ]);
    const latencyMs = Date.now() - start;
    const totalRecent = failed.length + active.length;
    if (totalRecent === 0)
      return {
        status: SystemHealthStatusEnum.HEALTHY,
        latencyMs,
        errorRate: 0,
      };
    const errorRate = failed.length / totalRecent;
    const status =
      errorRate === 0
        ? SystemHealthStatusEnum.HEALTHY
        : errorRate >= 0.5
          ? SystemHealthStatusEnum.DOWN
          : SystemHealthStatusEnum.DEGRADED;
    return { status, latencyMs, errorRate };
  }

  public async runHealthSweep(tenantId: string): Promise<SystemHealth[]> {
    const checks: Record<
      string,
      () => Promise<{
        status: SystemHealthStatusEnum;
        latencyMs: number;
        errorRate: number;
      }>
    > = {
      database: () => this.checkDatabase(),
      redis: () => this.checkRedis(),
      'connector-engine': () => this.checkConnectorEngine(tenantId),
      'workflow-engine': () => this.checkWorkflowEngine(tenantId),
    };

    const results: SystemHealth[] = [];
    for (const serviceName of MONITORED_SERVICES) {
      const result = await checks[serviceName]();
      const existing = await this.repository.getSystemHealth(
        tenantId,
        serviceName,
      );
      const previousStatus = existing?.status.value;

      const health =
        existing ||
        SystemHealth.create(crypto.randomUUID(), {
          tenantId,
          serviceName,
          status: result.status,
        });
      health.recordCheck(result.status, result.latencyMs, result.errorRate);
      await this.repository.upsertSystemHealth(health, tenantId);
      results.push(health);

      if (health.hasChangedStatusSince(previousStatus)) {
        await this.eventPublisher.publish(
          new SystemHealthChangedEvent(tenantId, serviceName, result.status),
        );
        await this.broadcast(
          tenantId,
          'system.health.changed',
          health.toJSON(),
        );

        if (result.status === SystemHealthStatusEnum.DOWN) {
          await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
            tenantId,
            affectedService: serviceName,
            title: `${serviceName} is down`,
            severity: IncidentSeverityEnum.CRITICAL,
            description: `Automated health check detected ${serviceName} is DOWN`,
          });
        } else if (result.status === SystemHealthStatusEnum.DEGRADED) {
          await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
            tenantId,
            affectedService: serviceName,
            title: `${serviceName} is degraded`,
            severity: IncidentSeverityEnum.MEDIUM,
            description: `Automated health check detected elevated error rate for ${serviceName}`,
          });
        } else if (result.status === SystemHealthStatusEnum.HEALTHY) {
          await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
            tenantId,
            affectedService: serviceName,
            resolve: true,
          });
        }
      }
    }

    return results;
  }

  public async listSystemHealth(tenantId: string): Promise<SystemHealth[]> {
    return this.repository.listSystemHealth(tenantId);
  }

  /** Refreshes live connector health flags once per sweep tick, decoupled from
   * the per-tenant health check above so it isn't repeated for every tenant. */
  public async refreshConnectorHealth(limit = 50): Promise<void> {
    await this.connectorHealthService.runHealthSweep(limit);
  }

  // ---- Operations Center: queue / worker / DLQ monitoring ----

  private resolveQueue(queueName: QueueName): Queue {
    return this.moduleRef.get<Queue>(getQueueToken(queueName), {
      strict: false,
    });
  }

  public listQueueNames(): QueueName[] {
    return Object.values(QUEUES);
  }

  public async getQueueStats(queueName: QueueName): Promise<QueueStats> {
    const queue = this.resolveQueue(queueName);
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
    const isPaused = await queue.isPaused();
    return {
      name: queueName,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: isPaused,
    };
  }

  public async getAllQueueStats(): Promise<QueueStats[]> {
    return Promise.all(
      this.listQueueNames().map((name) => this.getQueueStats(name)),
    );
  }

  public async getWorkers(queueName: QueueName): Promise<any[]> {
    const queue = this.resolveQueue(queueName);
    return queue.getWorkers();
  }

  public async getFailedJobs(
    queueName: QueueName,
    start = 0,
    end = 25,
  ): Promise<
    Array<{
      id: string | undefined;
      name: string;
      failedReason: string;
      attemptsMade: number;
      timestamp: number;
    }>
  > {
    const queue = this.resolveQueue(queueName);
    const jobs = await queue.getFailed(start, end);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  public async retryJob(queueName: QueueName, jobId: string): Promise<boolean> {
    const queue = this.resolveQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return false;
    await job.retry();
    return true;
  }

  public async getDeadLetterJobs(
    start = 0,
    end = 25,
  ): Promise<Array<{ id: string | undefined; data: DeadLetterPayload }>> {
    const queue = this.resolveQueue(QUEUES.DEAD_LETTER);
    const jobs = await queue.getJobs(
      ['waiting', 'completed', 'failed'],
      start,
      end,
    );
    return jobs.map((job) => ({
      id: job.id,
      data: job.data as DeadLetterPayload,
    }));
  }

  public async replayDeadLetterJob(jobId: string): Promise<boolean> {
    const queue = this.resolveQueue(QUEUES.DEAD_LETTER);
    const job = await queue.getJob(jobId);
    if (!job) return false;
    const payload = job.data as DeadLetterPayload;
    await this.queueService.addJob(
      payload.sourceQueue as QueueName,
      payload.jobName,
      payload.data,
    );
    await job.remove();
    return true;
  }

  public async getWorkflowMonitoring(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const statuses = [
      'DRAFT',
      'ACTIVE',
      'PAUSED',
      'COMPLETED',
      'FAILED',
      'ARCHIVED',
    ];
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const executions = await this.workflowExecutionService.findExecutions(
        tenantId,
        { status },
      );
      counts[status] = executions.length;
    }
    return counts;
  }
}
