import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TenantContext } from '@easydev/shared-kernel';

export abstract class BaseWorker extends WorkerHost {
  protected readonly logger: Logger;

  constructor(workerName: string) {
    super();
    this.logger = new Logger(workerName);
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const tenantContext = job.data._tenantContext;
    const tenantId = tenantContext?.tenantId;

    if (tenantId) {
      return TenantContext.run(tenantId, async () => {
        try {
          return await this.handleJob(job);
        } catch (error: any) {
          this.logger.error(`Job ${job.id} failed: ${error.message}`);
          await this.handleFailure(job, error);
          throw error;
        }
      });
    }

    try {
      return await this.handleJob(job);
    } catch (error: any) {
      this.logger.error(`Job ${job.id} failed without tenant: ${error.message}`);
      await this.handleFailure(job, error);
      throw error;
    }
  }

  abstract handleJob(job: Job<any, any, string>): Promise<any>;

  protected async handleFailure(job: Job<any, any, string>, error: Error): Promise<void> {
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      this.logger.error(`Job ${job.id} breached max attempts. Routing to DLQ.`);
    }
  }
}
