import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { db } from '@easydev/database';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  getProcessableQueueNames,
  shouldRunProcessor,
  QueueName,
} from '@easydev/shared-queues';
import {
  IamClient,
  PaymentClient,
  NotificationClient,
  FileUploadClient,
  IamServiceTokenProvider,
  AuthProbeResult,
} from '@easydev/shared-clients';

type ComponentResult = {
  status: 'UP' | 'DOWN';
  latencyMs?: number;
  error?: string;
};

// Reachability (does the host answer at all) plus a real credential-
// exercising probe (does THIS app's actual auth - HMAC/API key/Bearer -
// get accepted), reported separately. A service can be reachable but
// AUTH_FAILED (misconfigured/revoked credentials on either side) - that's
// a materially different problem than the host being down, and the whole
// point of asking "is service-to-service communication actually working".
type ServiceCommResult = {
  status: 'UP' | 'DOWN';
  reachable: ComponentResult;
  authVerified: AuthProbeResult;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async checkDatabase(): Promise<ComponentResult> {
    const start = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (e: any) {
      this.logger.error(`Database health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  async checkRedis(): Promise<ComponentResult> {
    const start = Date.now();
    try {
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        maxRetriesPerRequest: 1,
      });
      const response = await redis.ping();
      redis.disconnect();

      if (response === 'PONG') {
        return { status: 'UP', latencyMs: Date.now() - start };
      }
      return { status: 'DOWN', error: 'Invalid Ping Response' };
    } catch (e: any) {
      this.logger.error(`Redis health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  // Generic reachability probe for downstream services with no agreed-upon
  // dedicated health endpoint - any HTTP response (even a 404/401) proves
  // the service is up and routable; only a network-level failure
  // (ECONNREFUSED/ETIMEDOUT/DNS failure) means it's actually unreachable.
  private async probeHttp(
    baseUrl: string | undefined,
    path = '/health',
  ): Promise<ComponentResult> {
    if (!baseUrl) {
      return { status: 'DOWN', error: 'Base URL not configured' };
    }
    const start = Date.now();
    try {
      await axios.get(`${baseUrl}${path}`, {
        timeout: 3000,
        validateStatus: () => true,
      });
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (e: any) {
      return { status: 'DOWN', error: e.message };
    }
  }

  async checkAiPlatform(): Promise<ComponentResult> {
    const start = Date.now();
    const baseUrl = process.env.EASYDEV_AI_URL || 'https://api.easydev.ai';
    try {
      // /health/live is the AI platform's own cheap liveness probe (no DB/
      // Redis checks on its side) - hitting its deep /health would couple
      // this service's readiness to that platform's downstream dependencies.
      // No real auth-verifying probe here: every actual endpoint
      // (workflows/run, knowledge-base ingest/embed/rerank) has side
      // effects, so unlike IAM/payment/notification/file-upload there's no
      // safe read-only authenticated route to exercise.
      await axios.get(`${baseUrl}/health/live`, { timeout: 3000 });
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (e: any) {
      this.logger.error(`AI platform health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  private iamClient(): IamClient {
    const baseUrl =
      process.env.EASYDEV_IAM_URL ||
      process.env.IAM_SERVICE_INTERNAL_URL ||
      process.env.IAM_SERVICE_URL ||
      'http://localhost:3304';
    return new IamClient(baseUrl, process.env.IAM_SERVICE_API_KEY);
  }

  async checkIamService(): Promise<ServiceCommResult> {
    const client = this.iamClient();
    const baseUrl =
      process.env.EASYDEV_IAM_URL ||
      process.env.IAM_SERVICE_INTERNAL_URL ||
      process.env.IAM_SERVICE_URL;
    const [reachable, authVerified] = await Promise.all([
      this.probeHttp(baseUrl, '/api/v1/iam/health'),
      client.checkAuth(),
    ]);
    return {
      status: authVerified.status === 'UP' ? 'UP' : 'DOWN',
      reachable,
      authVerified,
    };
  }

  private paymentClient(): PaymentClient {
    const iamBaseUrl =
      process.env.EASYDEV_IAM_URL ||
      process.env.IAM_SERVICE_INTERNAL_URL ||
      process.env.IAM_SERVICE_URL ||
      'http://localhost:3304';
    const serviceTokenProvider = new IamServiceTokenProvider(
      iamBaseUrl,
      process.env.PAYMENT_IAM_CLIENT_ID,
      process.env.PAYMENT_IAM_CLIENT_SECRET,
      process.env.PAYMENT_IAM_SCOPES || 'payment:read payment:write',
    );
    return new PaymentClient(
      process.env.PAYMENT_SERVICE_URL || 'http://localhost:3302',
      process.env.PAYMENT_SERVICE_API_KEY || '',
      process.env.FILE_UPLOAD_HMAC_SECRET,
      serviceTokenProvider,
    );
  }

  async checkPaymentService(): Promise<ServiceCommResult> {
    const client = this.paymentClient();
    const [reachable, authVerified] = await Promise.all([
      // payment-microservice's real Terminus health endpoint (verified
      // against its source) - /api/v1/health, not bare /health.
      this.probeHttp(process.env.PAYMENT_SERVICE_URL, '/api/v1/health'),
      client.checkAuth(),
    ]);
    return {
      status: authVerified.status === 'UP' ? 'UP' : 'DOWN',
      reachable,
      authVerified,
    };
  }

  private notificationClient(): NotificationClient {
    return new NotificationClient(
      process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
      process.env.NOTIFICATION_SERVICE_API_KEY || '',
    );
  }

  async checkNotificationService(): Promise<ServiceCommResult> {
    const client = this.notificationClient();
    const [reachable, authVerified] = await Promise.all([
      // Real public liveness route (verified against its source) -
      // /v1/health, not bare /health.
      this.probeHttp(process.env.NOTIFICATION_SERVICE_URL, '/v1/health'),
      client.checkAuth(),
    ]);
    return {
      status: authVerified.status === 'UP' ? 'UP' : 'DOWN',
      reachable,
      authVerified,
    };
  }

  private fileUploadClient(): FileUploadClient {
    const baseUrl = (
      process.env.FILE_UPLOAD_SERVICE_URL || 'http://easydev-file-upload:8080'
    ).replace(/\/+$/, '');
    return new FileUploadClient(
      `${baseUrl}/api/files`,
      process.env.FILE_UPLOAD_HMAC_SECRET,
    );
  }

  async checkFileUploadService(): Promise<ServiceCommResult> {
    const client = this.fileUploadClient();
    const healthUrl = process.env.FILE_UPLOAD_SERVICE_HEALTH_URL;
    const [reachable, authVerified] = await Promise.all([
      healthUrl
        ? client.checkHealth(healthUrl)
        : Promise.resolve<ComponentResult>({
            status: 'DOWN',
            error: 'FILE_UPLOAD_SERVICE_HEALTH_URL not configured',
          }),
      client.checkAuth(),
    ]);
    return {
      status: authVerified.status === 'UP' ? 'UP' : 'DOWN',
      reachable,
      authVerified,
    };
  }

  async checkStorage(): Promise<{
    status: 'UP' | 'DOWN';
    freeSpaceGb?: number;
    error?: string;
  }> {
    // The only storage this app directly depends on today is the local
    // `uploads/` directory (widget attachments, served via
    // useStaticAssets in main.ts) - verify it's actually writable rather
    // than reporting a hardcoded fake value.
    const uploadsDir =
      process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
    const probeFile = join(uploadsDir, `.health-check-${process.pid}`);
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(probeFile, 'ok');
      await fs.unlink(probeFile);

      let freeSpaceGb: number | undefined;
      try {
        const stats = await fs.statfs(uploadsDir);
        freeSpaceGb =
          Math.round(((stats.bfree * stats.bsize) / 1024 / 1024 / 1024) * 100) /
          100;
      } catch {
        // statfs isn't available on every platform - omit rather than fake it.
      }

      return { status: 'UP', freeSpaceGb };
    } catch (e: any) {
      this.logger.error(`Storage health check failed: ${e.message}`);
      return { status: 'DOWN', error: e.message };
    }
  }

  // Per-queue worker/backlog visibility, cross-referenced against
  // PROCESS_QUEUE (shouldRunProcessor) so this process is only marked DOWN
  // for queues it's actually responsible for - the api role legitimately
  // runs zero queue processors, that's correct, not a failure. This is
  // exactly the class of bug (PROCESS_QUEUE set but no worker actually
  // attached, or a queue never assigned to any role at all) that previously
  // went unnoticed until traced manually; it's now a continuously-checked
  // health signal instead.
  async checkQueueWorkers(): Promise<{
    status: 'UP' | 'DOWN';
    managedQueues: QueueName[];
    queues: Array<{
      name: QueueName;
      managedByThisProcess: boolean;
      workers: number;
      waiting: number;
      active: number;
      failed: number;
      status: 'UP' | 'DOWN' | 'N/A';
      error?: string;
    }>;
  }> {
    const managedQueues = getProcessableQueueNames().filter((name) =>
      shouldRunProcessor(name),
    );
    const queues = await Promise.all(
      getProcessableQueueNames().map(async (name) => {
        const managedByThisProcess = shouldRunProcessor(name);
        try {
          const queue = this.moduleRef.get<Queue>(getQueueToken(name), {
            strict: false,
          });
          if (!queue) {
            return {
              name,
              managedByThisProcess,
              workers: 0,
              waiting: 0,
              active: 0,
              failed: 0,
              status: managedByThisProcess
                ? ('DOWN' as const)
                : ('N/A' as const),
              error: managedByThisProcess ? 'Queue not registered' : undefined,
            };
          }
          const [workers, counts] = await Promise.all([
            queue.getWorkers(),
            queue.getJobCounts('waiting', 'active', 'failed'),
          ]);
          const status: 'UP' | 'DOWN' | 'N/A' = !managedByThisProcess
            ? 'N/A'
            : workers.length > 0
              ? 'UP'
              : 'DOWN';
          return {
            name,
            managedByThisProcess,
            workers: workers.length,
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            failed: counts.failed || 0,
            status,
          };
        } catch (e: any) {
          return {
            name,
            managedByThisProcess,
            workers: 0,
            waiting: 0,
            active: 0,
            failed: 0,
            status: managedByThisProcess ? ('DOWN' as const) : ('N/A' as const),
            error: e.message,
          };
        }
      }),
    );

    const status = queues.some((q) => q.status === 'DOWN') ? 'DOWN' : 'UP';
    return { status, managedQueues, queues };
  }

  async runFullLivenessCheck(): Promise<{
    status: 'UP' | 'DOWN';
    components: Record<string, any>;
  }> {
    const [
      dbRes,
      redisRes,
      aiRes,
      storageRes,
      iamRes,
      paymentRes,
      notificationRes,
      fileUploadRes,
      queueWorkersRes,
    ] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAiPlatform(),
      this.checkStorage(),
      this.checkIamService(),
      this.checkPaymentService(),
      this.checkNotificationService(),
      this.checkFileUploadService(),
      this.checkQueueWorkers(),
    ]);

    const isAllUp =
      dbRes.status === 'UP' &&
      redisRes.status === 'UP' &&
      aiRes.status === 'UP' &&
      storageRes.status === 'UP' &&
      iamRes.status === 'UP' &&
      paymentRes.status === 'UP' &&
      notificationRes.status === 'UP' &&
      fileUploadRes.status === 'UP' &&
      queueWorkersRes.status === 'UP';

    return {
      status: isAllUp ? 'UP' : 'DOWN',
      components: {
        database: dbRes,
        redis: redisRes,
        aiPlatform: aiRes,
        storage: storageRes,
        iamService: iamRes,
        paymentService: paymentRes,
        notificationService: notificationRes,
        fileUploadService: fileUploadRes,
        queueWorkers: queueWorkersRes,
      },
    };
  }
}
