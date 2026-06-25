import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BaseWorker,
  QueueService,
  WORKER_OPTIONS,
} from '@easydev/shared-queues';
import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { AuditService } from '../../audit/audit.service';

@Processor('settings-queue', WORKER_OPTIONS)
@Injectable()
export class SettingsQueueProcessor extends BaseWorker {
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly auditService: AuditService,
    @Optional() queueService?: QueueService,
  ) {
    super('SettingsQueueProcessor', 'settings-queue', queueService);
    this.initRedis();
  }

  private initRedis() {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
      };
      this.redisClient = new Redis(redisOptions);
      this.isRedisConnected = true;
    } catch (err: any) {
      this.logger.warn(
        `Failed to connect Redis in SettingsQueueProcessor: ${err.message}. Running cacheless.`,
      );
    }
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'settings-sync-job':
        this.logger.log(
          `Processing settings-sync-job ${job.id} for Tenant: ${tenantId}`,
        );
        const settings = await this.settingsRepo.getSettingsByTenant(tenantId);
        if (settings && this.isRedisConnected && this.redisClient) {
          const cacheKey = `settings:snapshot:${tenantId}`;
          await this.redisClient.set(
            cacheKey,
            JSON.stringify(settings.toJSON()),
            'EX',
            3600,
          ); // 1 hour cache
        }
        return { success: true };

      case 'feature-flag-refresh-job':
        this.logger.log(
          `Processing feature-flag-refresh-job ${job.id} for Tenant: ${tenantId}, Flag: ${job.data.flagKey}`,
        );
        if (this.isRedisConnected && this.redisClient) {
          const cacheKey = `settings:flags:${tenantId}:${job.data.flagKey}`;
          await this.redisClient.del(cacheKey);
        }
        return { success: true };

      case 'usage-limit-job':
        this.logger.log(
          `Processing usage-limit-job ${job.id} for Tenant: ${tenantId}`,
        );
        const limits = await this.settingsRepo.getUsageLimits(tenantId);
        if (limits && this.isRedisConnected && this.redisClient) {
          const cacheKey = `settings:usage:${tenantId}`;
          await this.redisClient.set(
            cacheKey,
            JSON.stringify(limits.toJSON()),
            'EX',
            3600,
          );
        }
        return { success: true };

      case 'settings-audit-job':
        this.logger.log(
          `Processing settings-audit-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.log({
          tenantId,
          action: job.data.eventName || 'settings.updated',
          details: `Settings updated (system-queue): ${JSON.stringify(job.data.payload || {})}`,
        });
        return { success: true };

      default:
        this.logger.warn(`Unknown job name in settings-queue: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
