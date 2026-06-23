import {
  Injectable,
  Inject,
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

@Injectable()
export class WorkflowApprovalService {
  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
    private readonly eventPublisher: WorkflowEventPublisher,
    private readonly queueService: QueueService,
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
   * isExpired() existed but was only ever checked lazily, if and when
   * someone happened to call approve() on an already-expired approval - an
   * approval nobody ever touched again just sat PENDING forever, silently
   * blocking its workflow execution with no escalation to anyone. This sweep
   * (invoked by a scheduler mirroring SlaMonitorScheduler) proactively
   * rejects expired approvals and raises an operational incident so a human
   * knows a workflow died waiting on an approval that timed out.
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

      try {
        await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
          tenantId: approval.tenantId,
          affectedService: 'workflow.approval-timeout',
          title: 'Workflow execution blocked by an expired approval',
          severity: 'MEDIUM',
          description: `Approval ${approval.id} for workflow execution ${approval.workflowExecutionId} expired without a decision and was auto-rejected.`,
        });
      } catch {
        // Incident visibility is best-effort; the rejection above already
        // unblocked the workflow either way.
      }
    }

    return { expired: expired.length };
  }
}
