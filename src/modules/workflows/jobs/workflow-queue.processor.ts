import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BaseWorker,
  QueueService,
  WORKER_OPTIONS,
} from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { WorkflowScheduleService } from '../services/workflow-schedule.service';
import { WorkflowApprovalService } from '../services/workflow-approval.service';
import { WorkflowTemplateService } from '../services/workflow-template.service';

@Processor('workflow-queue', WORKER_OPTIONS)
@Injectable()
export class WorkflowQueueProcessor extends BaseWorker {
  constructor(
    private readonly engineService: WorkflowEngineService,
    private readonly scheduleService: WorkflowScheduleService,
    private readonly approvalService: WorkflowApprovalService,
    private readonly templateService: WorkflowTemplateService,
    @Optional() queueService?: QueueService,
  ) {
    super('WorkflowQueueProcessor', 'workflow-queue', queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'workflow-approval-timeout-job': {
        this.logger.log(`Processing workflow-approval-timeout-job ${job.id}`);
        return this.approvalService.sweepExpiredApprovals(job.data.tenantId);
      }

      case 'workflow-execution-job':
        this.logger.log(
          `Processing workflow-execution-job ${job.id} for execution ${job.data.executionId}`,
        );
        // Handle background execution tracking or heartbeat
        return { success: true };

      case 'workflow-approval-job':
        this.logger.log(
          `Processing workflow-approval-job ${job.id} for approval ${job.data.approvalId}`,
        );
        const approval = await this.approvalService.getApproval(
          tenantId,
          job.data.approvalId,
        );
        if (approval.isExpired()) {
          this.logger.log(
            `Approval ${approval.id} has expired. Triggering auto-rejection.`,
          );
          try {
            await this.approvalService.reject(
              tenantId,
              approval.id,
              'Auto-rejected: Approval request expired.',
            );
            await this.engineService.resumeExecution(
              tenantId,
              approval.workflowExecutionId,
              false,
              'SYSTEM',
              'Auto-rejected: Expired',
            );
          } catch (err: any) {
            this.logger.warn(
              `Failure processing approval timeout: ${err.message}`,
            );
          }
          return { status: 'expired_rejected' };
        }
        return { status: 'checked_active' };

      case 'workflow-schedule-job':
        this.logger.log(
          `Processing workflow-schedule-job ${job.id} for schedule ${job.data.scheduleId}`,
        );
        const schedule = await this.scheduleService.getSchedule(
          tenantId,
          job.data.scheduleId,
        );
        if (schedule.isActive) {
          const template = await this.templateService.getTemplate(
            tenantId,
            schedule.workflowId,
          );
          const executionId = await this.engineService.runWorkflowTemplate(
            tenantId,
            template,
            { scheduleId: schedule.id, triggeredAt: new Date().toISOString() },
            'SCHEDULED',
          );
          await this.scheduleService.recordExecutionRun(tenantId, schedule.id);
          return { executionId, status: 'triggered' };
        }
        return { status: 'skipped_inactive' };

      case 'workflow-retry-job':
        this.logger.log(
          `Processing workflow-retry-job ${job.id} for execution ${job.data.executionId}`,
        );
        const execution = await this.engineService.resumeExecution(
          tenantId,
          job.data.executionId,
          true,
          'RETRY_ENGINE',
          'Retrying execution step',
        );
        return { success: true };

      case 'workflow-cleanup-job':
        this.logger.log(`Processing workflow-cleanup-job ${job.id}`);
        // Clean up archived/completed executions database-wide or log retention
        return { cleaned: true };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
