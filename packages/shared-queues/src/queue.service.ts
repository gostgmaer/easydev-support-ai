import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueName } from './queue-definitions';
import { TenantContext } from '@easydev/shared-kernel';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async addJob<T = any>(queueName: QueueName, jobName: string, data: T, opts?: any): Promise<any> {
    try {
      const queueToken = getQueueToken(queueName);
      const queue = this.moduleRef.get<Queue>(queueToken, { strict: false });

      const tenantId = TenantContext.getTenantId();

      const payload = {
        ...data,
        _tenantContext: { tenantId }
      };

      const defaultOpts = {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      };

      const job = await queue.add(jobName, payload, { ...defaultOpts, ...opts });
      this.logger.debug(`Enqueued job ${jobName} [ID: ${job.id}] in queue ${queueName} for Tenant: ${tenantId}`);
      return job;
    } catch (e: any) {
      this.logger.error(`Failed to add job to queue ${queueName}: ${e.message}`);
      throw e;
    }
  }
}
