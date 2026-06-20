import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue, JobsOptions } from 'bullmq';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import {
  QueueName,
  QUEUES,
  DEFAULT_JOB_OPTIONS,
  DEAD_LETTER_JOB_OPTIONS,
  DeadLetterPayload,
} from './queue-definitions';
import { TenantContext } from '@easydev/shared-kernel';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  private resolveQueue(queueName: QueueName): Queue {
    const queueToken = getQueueToken(queueName);
    return this.moduleRef.get<Queue>(queueToken, { strict: false });
  }

  async addJob<T = unknown>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<Job> {
    try {
      const queue = this.resolveQueue(queueName);
      const tenantId = TenantContext.getTenantId();

      const payload = {
        ...data,
        _tenantContext: { tenantId },
      };

      const job = await queue.add(jobName, payload, {
        ...DEFAULT_JOB_OPTIONS,
        ...opts,
      });

      this.logger.debug(
        `Enqueued job ${jobName} [ID: ${job.id}] in queue ${queueName} for Tenant: ${tenantId ?? 'none'}`,
      );
      return job;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to add job to queue ${queueName}: ${message}`);
      throw e;
    }
  }

  /**
   * Routes a job that has exhausted its retry budget into the dead-letter queue,
   * preserving the original payload, tenant context and failure metadata.
   */
  async moveToDeadLetter(
    sourceQueue: QueueName,
    job: Job,
    error: Error,
  ): Promise<Job<DeadLetterPayload>> {
    const tenantId =
      (job.data?._tenantContext?.tenantId as string | undefined) ??
      TenantContext.getTenantId();

    const payload: DeadLetterPayload = {
      sourceQueue,
      jobName: job.name,
      originalJobId: job.id,
      attemptsMade: job.attemptsMade,
      failedReason: error.message,
      stack: error.stack,
      failedAt: new Date().toISOString(),
      tenantId,
      data: job.data,
    };

    const dlq = this.resolveQueue(QUEUES.DEAD_LETTER);
    const dlqJob = await dlq.add(`dead:${sourceQueue}:${job.name}`, payload, {
      ...DEAD_LETTER_JOB_OPTIONS,
    });

    this.logger.warn(
      `Routed job ${job.id} from ${sourceQueue} to dead-letter-queue [DLQ ID: ${dlqJob.id}]`,
    );
    return dlqJob as Job<DeadLetterPayload>;
  }
}
