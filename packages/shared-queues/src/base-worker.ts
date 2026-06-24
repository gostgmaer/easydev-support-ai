import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
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
export abstract class BaseWorker
  extends WorkerHost
  implements OnApplicationBootstrap
{
  protected readonly logger: Logger;

  constructor(
    workerName: string,
    protected readonly sourceQueue?: QueueName,
    protected readonly queueService?: QueueService,
  ) {
    super();
    this.logger = new Logger(workerName);
  }

  /**
   * A job that exceeds WORKER_OPTIONS.maxStalledCount (worker crash/OOM mid-job,
   * repeated lock loss) is failed by BullMQ's own stalled-checker before our
   * process() override ever runs - it never reaches handleJob()/handleFailure()
   * below, so it was previously dropped silently (not retried, not dead-lettered,
   * invisible to the replay endpoint). BullMQ surfaces this case as an
   * UnrecoverableError on the underlying Worker's 'failed' event, which is the
   * one signal available after the fact to catch it and route it to the same
   * dead-letter queue normal exhausted-retry failures already use.
   */
  onApplicationBootstrap(): void {
    this.worker.on('failed', (job, err) => {
      if (!job || err?.name !== 'UnrecoverableError') {
        return;
      }
      this.logger.error(
        `Job ${job.id} [${job.name}] dropped by BullMQ's stalled-job checker (${err.message}) - routing to dead-letter-queue instead of losing it.`,
      );
      void this.routeToDeadLetter(job, err);
    });
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

    await this.routeToDeadLetter(job, error);
  }

  private async routeToDeadLetter(
    job: Job<any, any, string>,
    error: Error,
  ): Promise<void> {
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
