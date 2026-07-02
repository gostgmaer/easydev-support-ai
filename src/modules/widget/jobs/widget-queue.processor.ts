import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BaseWorker,
  QueueService,
  WORKER_OPTIONS,
} from '@easydev/shared-queues';
import { Injectable, Optional, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { AuditService } from '../../audit/audit.service';
import { db, schema } from '@easydev/database';
import { lt } from 'drizzle-orm';

@Processor('widget-queue', WORKER_OPTIONS)
@Injectable()
export class WidgetQueueProcessor extends BaseWorker {
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly auditService: AuditService,
    @Optional() queueService?: QueueService,
  ) {
    super('WidgetQueueProcessor', 'widget-queue', queueService);
    this.initRedis();
  }

  private initRedis() {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        password: process.env.REDIS_PASSWORD,
      };
      this.redisClient = new Redis(redisOptions);
      this.isRedisConnected = true;
    } catch (err: any) {
      this.logger.warn(
        `Failed to connect Redis in WidgetQueueProcessor: ${err.message}. Running cacheless.`,
      );
    }
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'widget-session-job':
        this.logger.log(
          `Processing widget-session-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.log({
          tenantId,
          action: job.data.eventName || 'widget.session.started',
          details: `Widget Session Event (system-queue): ${JSON.stringify(job.data.payload || {})}`,
        });
        return { success: true };

      case 'widget-lead-job':
        this.logger.log(
          `Processing widget-lead-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.log({
          tenantId,
          action: job.data.eventName || 'widget.lead.created',
          details: `Widget Lead Captured (system-queue): ${JSON.stringify(job.data.payload || {})}`,
        });
        return { success: true };

      case 'widget-analytics-job':
        this.logger.log(
          `Processing widget-analytics-job ${job.id} for Tenant: ${tenantId}`,
        );
        if (this.isRedisConnected && this.redisClient) {
          const key = `widget:analytics:${tenantId}:daily_events`;
          await this.redisClient.incr(key);
          await this.redisClient.expire(key, 86400 * 7); // Expire after 7 days
        }
        return { success: true };

      case 'widget-cleanup-job': {
        this.logger.log(`Processing widget-cleanup-job ${job.id}`);
        // Clean up expired widget auth tokens older than current time
        const now = new Date();
        await db
          .delete(schema.widgetAuthTokens)
          .where(lt(schema.widgetAuthTokens.expiresAt, now));
        return { success: true };
      }

      case 'widget-installation-job':
        this.logger.log(
          `Processing widget-installation-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.log({
          tenantId,
          action: job.data.eventName || 'widget.installed',
          details: `Widget Installation Configured (system-queue): ${JSON.stringify(job.data.payload || {})}`,
        });
        return { success: true };

      default:
        // Same rationale as AnalyticsQueueProcessor's default case: throwing
        // here just burns retry budget toward the DLQ for job names this
        // processor was never going to recognize. Acknowledge instead.
        this.logger.warn(
          `No handler implemented for job name "${job.name}" - acknowledging without processing`,
        );
        return { success: true, acknowledged: true, unhandled: job.name };
    }
  }
}
