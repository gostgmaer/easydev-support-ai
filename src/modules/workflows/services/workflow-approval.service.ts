import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IWorkflowRepository } from '../repositories/workflow-repository.interface';
import { WorkflowApproval } from '../domain';
import { ApprovalStatusEnum } from '../domain/value-objects';
import { WorkflowEventPublisher } from './workflow-event.publisher';
import { WorkflowApprovedEvent, WorkflowRejectedEvent, WorkflowApprovalRequestedEvent } from '@easydev/shared-events';
import * as crypto from 'crypto';

@Injectable()
export class WorkflowApprovalService {
  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
    private readonly eventPublisher: WorkflowEventPublisher,
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
      new WorkflowApprovalRequestedEvent(tenantId, approvalId, workflowExecutionId, approverId),
    );
    return saved;
  }

  public async getApproval(tenantId: string, id: string): Promise<WorkflowApproval> {
    const approval = await this.repository.getApprovalById(id, tenantId);
    if (!approval) {
      throw new NotFoundException(`Workflow approval with ID ${id} not found`);
    }
    return approval;
  }

  public async approve(tenantId: string, id: string, comments?: string): Promise<WorkflowApproval> {
    const approval = await this.getApproval(tenantId, id);

    if (approval.approvalStatus !== ApprovalStatusEnum.PENDING) {
      throw new BadRequestException(`Approval is already resolved as ${approval.approvalStatus}`);
    }

    if (approval.isExpired()) {
      approval.reject('Auto-rejected: Approval request expired.');
      await this.repository.saveApproval(approval, tenantId);
      await this.eventPublisher.publish(new WorkflowRejectedEvent(tenantId, id, approval.workflowExecutionId));
      throw new BadRequestException('Approval request has expired and was auto-rejected.');
    }

    approval.approve(comments);
    const saved = await this.repository.saveApproval(approval, tenantId);
    await this.eventPublisher.publish(new WorkflowApprovedEvent(tenantId, id, approval.workflowExecutionId));
    return saved;
  }

  public async reject(tenantId: string, id: string, comments?: string): Promise<WorkflowApproval> {
    const approval = await this.getApproval(tenantId, id);

    if (approval.approvalStatus !== ApprovalStatusEnum.PENDING) {
      throw new BadRequestException(`Approval is already resolved as ${approval.approvalStatus}`);
    }

    approval.reject(comments);
    const saved = await this.repository.saveApproval(approval, tenantId);
    await this.eventPublisher.publish(new WorkflowRejectedEvent(tenantId, id, approval.workflowExecutionId));
    return saved;
  }

  public async getApprovalsForExecution(tenantId: string, executionId: string): Promise<WorkflowApproval[]> {
    return this.repository.findApprovalsByExecutionId(executionId, tenantId);
  }
}
