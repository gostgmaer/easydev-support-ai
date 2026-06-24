import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, WORKER_OPTIONS } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { AiResponseService } from '../services/ai-response.service';
import { AiToolExecutionService } from '../services/ai-tool-execution.service';
import { AiEscalationService } from '../services/ai-escalation.service';
import { AiUsageService } from '../services/ai-usage.service';
import { AiWorkflowService } from '../services/ai-workflow.service';
import { AIPlatformClient } from '../services/ai-platform.client';

@Processor('ai-queue', WORKER_OPTIONS)
@Injectable()
export class AiQueueProcessor extends BaseWorker {
  constructor(
    private readonly responseService: AiResponseService,
    private readonly toolService: AiToolExecutionService,
    private readonly escalationService: AiEscalationService,
    private readonly usageService: AiUsageService,
    private readonly workflowService: AiWorkflowService,
    private readonly aiClient: AIPlatformClient,
    @Optional() queueService?: QueueService,
  ) {
    super('AiQueueProcessor', 'ai-queue' as any, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'ai-workflow-job':
        this.logger.log(
          `Processing ai-workflow-job ${job.id} for execution ${job.data.workflowExecutionId}`,
        );
        // Background workflow triggering or checking
        return { success: true };

      case 'ai-tool-execution-job':
        this.logger.log(
          `Processing ai-tool-execution-job ${job.id} for request ${job.data.toolRequestId}`,
        );
        return this.toolService.executeTool(
          tenantId,
          job.data.workflowExecutionId,
          job.data.workflowId || 'default-workflow',
          job.data.toolName,
          job.data.capability,
          job.data.payload || {},
          // RR-18: stable across a BullMQ-level retry of this same job and
          // across the AI Platform redispatching the same logical tool call
          // - the connector-level idempotency key, not just an id for logging.
          job.data.toolRequestId,
        );

      case 'ai-tool-result-submission-job':
        this.logger.log(
          `Processing ai-tool-result-submission-job ${job.id} for request ${job.data.requestId}`,
        );
        await this.aiClient.submitToolResult(
          tenantId,
          job.data.workflowId,
          job.data.requestId,
          job.data.payload,
          job.data.status,
        );
        return { submitted: true, requestId: job.data.requestId };

      case 'ai-escalation-job':
        this.logger.log(
          `Processing ai-escalation-job ${job.id} for escalation ${job.data.escalationId}`,
        );
        // Asynchronously process escalation notification/routing if needed
        return { status: 'processed', escalationId: job.data.escalationId };

      case 'ai-usage-job':
        this.logger.log(
          `Processing ai-usage-job ${job.id} for agent ${job.data.agentId}`,
        );
        return this.usageService.recordUsage(
          tenantId,
          job.data.agentId,
          job.data.tokensUsed || 0,
          job.data.cost || 0.0,
          true,
          job.data.toolCalls || 0,
        );

      case 'ai-retry-job':
        this.logger.log(`Processing ai-retry-job ${job.id}`);
        // Handle custom workflow retry logic
        if (job.data.workflowId && job.data.conversationId) {
          return this.workflowService.triggerWorkflow(
            tenantId,
            job.data.workflowId,
            job.data.conversationId,
            job.data.variables || {},
          );
        }
        return { retried: false };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
