import { Injectable, Logger } from '@nestjs/common';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { ExecutionEngine } from './execution-engine';

@Injectable()
export class RetryEngine {
  private readonly logger = new Logger(RetryEngine.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly executionEngine: ExecutionEngine,
  ) {}

  public async processRetryJob(data: {
    tenantId: string;
    capabilityType: any;
    params: Record<string, any>;
    options: any;
  }): Promise<any> {
    const { tenantId, capabilityType, params, options } = data;
    this.logger.log(
      `Processing retry job for capability ${capabilityType} (Attempt: ${options.attempt})`,
    );

    try {
      return await this.executionEngine.execute(tenantId, capabilityType, params, options);
    } catch (error: any) {
      this.logger.error(`Retry attempt ${options.attempt} failed: ${error.message}`);
      throw error; // Re-throw to fail the BullMQ job or let it exhaust
    }
  }
}
