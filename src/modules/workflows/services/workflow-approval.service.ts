import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IWorkflowRepository } from '../repositories/workflow-repository.interface';
import { WorkflowApproval } from '../domain';
import { ApprovalStatusEnum } from '../domain/value-objects';
import { WorkflowEventPublisher } from './workflow-event.publisher';
import {
  WorkflowApprovedEvent,
  WorkflowRejectedEvent,
  WorkflowApprovalRequestedEvent,
} from '@easydev/shared-events';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import * as crypto from 'crypto';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowApprovalService {
  private readonly logger = new Logger(WorkflowApprovalService.name);

  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
    private readonly eventPublisher: WorkflowEventPublisher,
    private readonly queueService: QueueService,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly engineService: WorkflowEngineService,
  ) {}

  public async createApproval(
    tenantId: string,
    workflowExecutionId: string,
    approverId: string,
    timeoutHours = 24,
  ): Promise<WorkflowApproval> {
    const approvalId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + timeoutHours * 3600000);

    const approval = new WorkflowApproval(approvalId, {
      tenantId,
      workflowExecutionId,
      approverId,
      approvalStatus: ApprovalStatusEnum.PENDING,
      expiresAt,
    });

    const saved = await this.repository.saveApproval(approval, tenantId);
    await this.eventPublisher.publish(
      new WorkflowApprovalRequestedEvent(
        tenantId,
        approvalId,
        workflowExecutionId,
        approverId,
      ),
    );
    return saved;
  }

  public async getApproval(
    tenantId: string,
    id: string,
  ): Promise<WorkflowApproval> {
    const approval = await this.repository.getApprovalById(id, tenantId);
    if (!approval) {
      throw new NotFoundException(`Workflow approval with ID ${id} not found`);
    }
    return approval;
  }

  public async approve(
    tenantId: string,
    id: string,
    comments?: string,
  ): Promise<WorkflowApproval> {
    const approval = await this.getApproval(tenantId, id);

    if (approval.approvalStatus !== ApprovalStatusEnum.PENDING) {
      throw new BadRequestException(
        `Approval is already resolved as ${approval.approvalStatus}`,
      );
    }

    if (approval.isExpired()) {
      approval.reject('Auto-rejected: Approval request expired.');
      await this.repository.saveApproval(approval, tenantId);
      await this.eventPublisher.publish(
        new WorkflowRejectedEvent(tenantId, id, approval.workflowExecutionId),
      );
      await this.resumeAsRejected(
        tenantId,
        approval.workflowExecutionId,
        'Auto-rejected: Approval request expired.',
      );
      throw new BadRequestException(
        'Approval request has expired and was auto-rejected.',
      );
    }

    approval.approve(comments);
    const saved = await this.repository.saveApproval(approval, tenantId);
    await this.eventPublisher.publish(
      new WorkflowApprovedEvent(tenantId, id, approval.workflowExecutionId),
    );
    return saved;
  }

  public async reject(
    tenantId: string,
    id: string,
    comments?: string,
  ): Promise<WorkflowApproval> {
    const approval = await this.getApproval(tenantId, id);

    if (approval.approvalStatus !== ApprovalStatusEnum.PENDING) {
      throw new BadRequestException(
        `Approval is already resolved as ${approval.approvalStatus}`,
      );
    }

    approval.reject(comments);
    const saved = await this.repository.saveApproval(approval, tenantId);
    await this.eventPublisher.publish(
      new WorkflowRejectedEvent(tenantId, id, approval.workflowExecutionId),
    );
    return saved;
  }

  public async getApprovalsForExecution(
    tenantId: string,
    executionId: string,
  ): Promise<WorkflowApproval[]> {
    return this.repository.findApprovalsByExecutionId(executionId, tenantId);
  }

  /**
   * Auto-rejecting the approval row alone never touched the paused
   * WorkflowExecution - resumeExecution() must run the same way it does from
   * the manual approve/reject HTTP path (workflow-approval.controller.ts),
   * or the execution sits PAUSED forever even after its approval is
   * resolved. Best-effort: if the execution already moved on (e.g. a manual
   * decision raced this sweep), resumeExecution() throws because it's no
   * longer PAUSED - that's not a failure of this sweep, the approval row is
   * already correctly rejected either way.
   */
  private async resumeAsRejected(
    tenantId: string,
    workflowExecutionId: string,
    comments: string,
  ): Promise<void> {
    try {
      await this.engineService.resumeExecution(
        tenantId,
        workflowExecutionId,
        false,
        'system',
        comments,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to resume execution ${workflowExecutionId} after approval rejection: ${err.message}`,
      );
    }
  }

  /**
   * isExpired() existed but was only ever checked lazily, if and when
   * someone happened to call approve() on an already-expired approval - an
   * approval nobody ever touched again just sat PENDING forever, silently
   * blocking its workflow execution with no escalation to anyone. This sweep
   * (invoked by a scheduler mirroring SlaMonitorScheduler) proactively
   * rejects expired approvals, resumes (and fails) their paused execution,
   * and raises an operational incident so a human knows a workflow died
   * waiting on an approval that timed out.
   */
  public async sweepExpiredApprovals(
    tenantId?: string,
  ): Promise<{ expired: number }> {
    const expired = await this.repository.findExpiredPendingApprovals(
      tenantId,
      new Date(),
    );

    for (const approval of expired) {
      approval.reject('Auto-rejected: Approval request expired.');
      await this.repository.saveApproval(approval, approval.tenantId);
      await this.eventPublisher.publish(
        new WorkflowRejectedEvent(
          approval.tenantId,
          approval.id,
          approval.workflowExecutionId,
        ),
      );

      await this.resumeAsRejected(
        approval.tenantId,
        approval.workflowExecutionId,
        'Auto-rejected: Approval request expired.',
      );

      try {
        await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
          tenantId: approval.tenantId,
          affectedService: 'workflow.approval-timeout',
          title: 'Workflow execution blocked by an expired approval',
          severity: 'MEDIUM',
          description: `Approval ${approval.id} for workflow execution ${approval.workflowExecutionId} expired without a decision and was auto-rejected.`,
        });
      } catch {
        // Incident visibility is best-effort; the rejection and resume
        // above already unblocked the workflow either way.
      }
    }

    return { expired: expired.length };
  }
}
