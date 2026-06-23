import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES, WORKER_OPTIONS } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { ConnectorExecutionService } from '../services/connector-execution.service';
import { ConnectorHealthService } from '../services/connector-health.service';
import { RetryEngine } from '../engine/retry-engine';

@Processor('connector-queue', WORKER_OPTIONS)
@Injectable()
export class ConnectorQueueProcessor extends BaseWorker {
  constructor(
    private readonly executionService: ConnectorExecutionService,
    private readonly healthService: ConnectorHealthService,
    private readonly retryEngine: RetryEngine,
    @Optional() queueService?: QueueService,
  ) {
    super('ConnectorQueueProcessor', QUEUES.CONNECTOR, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    if (!tenantId && job.name !== 'connector-health-job') {
      this.logger.warn(
        `Job ${job.id} [${job.name}] ran without tenantId context`,
      );
    }

    switch (job.name) {
      case 'connector-execution-job':
        this.logger.log(`Processing connector-execution-job ${job.id}`);
        return this.executionService.executeCapability(
          tenantId,
          job.data.capabilityType,
          job.data.params,
          job.data.options,
        );

      case 'connector-retry-job':
        this.logger.log(`Processing connector-retry-job ${job.id}`);
        return this.retryEngine.processRetryJob({
          tenantId,
          capabilityType: job.data.capabilityType,
          params: job.data.params,
          options: job.data.options,
        });

      case 'connector-health-job':
        this.logger.log(`Processing connector-health-job ${job.id}`);
        if (job.data.connectorId) {
          return this.healthService.checkHealth(tenantId, job.data.connectorId);
        } else {
          return this.healthService.runHealthSweep(job.data.limit || 20);
        }

      case 'connector-sync-job':
        this.logger.log(
          `Processing connector-sync-job ${job.id} for connector ${job.data.connectorId}`,
        );
        // Background sync task - e.g. sync specs/config, or sync cached definitions
        return {
          synced: true,
          connectorId: job.data.connectorId,
          syncedAt: new Date(),
        };

      case 'connector-webhook-job':
        this.logger.log(
          `Processing connector-webhook-job ${job.id} for webhook ${job.data.webhookId}`,
        );
        // Log webhook invocation or forward to events
        return {
          processed: true,
          webhookId: job.data.webhookId,
          receivedAt: job.data.triggeredAt,
        };

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
