import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TenantContext } from '@easydev/shared-kernel';
import { QueueName } from './queue-definitions';
import { QueueService } from './queue.service';

/**
 * Base class for every BullMQ worker.
 *
 * Responsibilities:
 *  - Restores tenant context from the job envelope so downstream code stays
 *    tenant-scoped (multi-tenant isolation).
 *  - Centralises failure handling and dead-letter routing.
 *
 * Subclasses that want automatic dead-letter routing pass the source queue name
 * and the {@link QueueService} to `super(...)`. The extra arguments are optional
 * to preserve backwards compatibility with workers that only log failures.
 */
export abstract class BaseWorker extends WorkerHost {
  protected readonly logger: Logger;

  constructor(
    workerName: string,
    protected readonly sourceQueue?: QueueName,
    protected readonly queueService?: QueueService,
  ) {
    super();
    this.logger = new Logger(workerName);
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const tenantId: string | undefined = job.data?._tenantContext?.tenantId;

    const run = async (): Promise<any> => {
      try {
        return await this.handleJob(job);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Job ${job.id} [${job.name}] failed: ${err.message}`,
        );
        await this.handleFailure(job, err);
        throw err;
      }
    };

    return tenantId ? TenantContext.run(tenantId, run) : run();
  }

  abstract handleJob(job: Job<any, any, string>): Promise<any>;

  /**
   * Invoked on every failed attempt. Once a job exhausts its retry budget it is
   * routed to the dead-letter queue (when a {@link QueueService} is wired in).
   */
  protected async handleFailure(
    job: Job<any, any, string>,
    error: Error,
  ): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    this.logger.error(
      `Job ${job.id} breached max attempts (${maxAttempts}). Routing to dead-letter-queue.`,
    );

    if (this.queueService && this.sourceQueue) {
      try {
        await this.queueService.moveToDeadLetter(this.sourceQueue, job, error);
      } catch (dlqError) {
        const message =
          dlqError instanceof Error ? dlqError.message : String(dlqError);
        this.logger.error(`Failed to route job ${job.id} to DLQ: ${message}`);
      }
    }
  }
}
