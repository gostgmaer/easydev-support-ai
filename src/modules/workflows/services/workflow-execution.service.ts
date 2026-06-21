import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IWorkflowRepository } from '../repositories/workflow-repository.interface';
import { WorkflowExecution } from '../domain';
import { ExecuteWorkflowDto } from '../dtos/workflow.dto';
import { WorkflowStatusEnum } from '../domain/value-objects';
import { WorkflowEventPublisher } from './workflow-event.publisher';
import {
  WorkflowExecutionStartedEvent,
  WorkflowExecutionCompletedEvent,
  WorkflowExecutionFailedEvent,
} from '@easydev/shared-events';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import * as crypto from 'crypto';

@Injectable()
export class WorkflowExecutionService {
  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
    private readonly eventPublisher: WorkflowEventPublisher,
    private readonly realtime: InboxRealtimeService,
  ) {}

  public async createExecution(
    tenantId: string,
    dto: ExecuteWorkflowDto,
  ): Promise<WorkflowExecution> {
    const executionId = crypto.randomUUID();

    const execution = WorkflowExecution.create(executionId, {
      tenantId,
      workflowId: dto.workflowId,
      executionStatus: WorkflowStatusEnum.DRAFT,
      triggerSource: dto.triggerSource || 'MANUAL',
      triggerReferenceId: dto.triggerReferenceId,
      context: dto.context || {},
      approvals: [],
    });

    const saved = await this.repository.saveExecution(execution, tenantId);
    await this.realtime.emitWorkflowExecutionUpdate(tenantId, saved.toJSON());
    return saved;
  }

  public async getExecution(
    tenantId: string,
    id: string,
  ): Promise<WorkflowExecution> {
    const execution = await this.repository.getExecutionById(id, tenantId);
    if (!execution) {
      throw new NotFoundException(`Workflow execution with ID ${id} not found`);
    }
    return execution;
  }

  public async findExecutions(
    tenantId: string,
    options?: { workflowId?: string; status?: string },
  ): Promise<WorkflowExecution[]> {
    return this.repository.findExecutions(tenantId, options);
  }

  public async startExecution(
    tenantId: string,
    id: string,
  ): Promise<WorkflowExecution> {
    const execution = await this.getExecution(tenantId, id);
    execution.start();
    const saved = await this.repository.saveExecution(execution, tenantId);
    await this.eventPublisher.publish(
      new WorkflowExecutionStartedEvent(tenantId, id, execution.workflowId),
    );
    await this.realtime.emitWorkflowExecutionUpdate(tenantId, saved.toJSON());
    return saved;
  }

  public async completeExecution(
    tenantId: string,
    id: string,
    result: Record<string, any>,
  ): Promise<WorkflowExecution> {
    const execution = await this.getExecution(tenantId, id);
    execution.complete(result);
    const saved = await this.repository.saveExecution(execution, tenantId);
    await this.eventPublisher.publish(
      new WorkflowExecutionCompletedEvent(
        tenantId,
        id,
        execution.workflowId,
        result,
      ),
    );
    await this.realtime.emitWorkflowExecutionUpdate(tenantId, saved.toJSON());
    return saved;
  }

  public async failExecution(
    tenantId: string,
    id: string,
    error: Record<string, any>,
  ): Promise<WorkflowExecution> {
    const execution = await this.getExecution(tenantId, id);
    execution.fail(error);
    const saved = await this.repository.saveExecution(execution, tenantId);
    await this.eventPublisher.publish(
      new WorkflowExecutionFailedEvent(
        tenantId,
        id,
        execution.workflowId,
        error,
      ),
    );
    await this.realtime.emitWorkflowExecutionUpdate(tenantId, saved.toJSON());
    return saved;
  }

  public async pauseExecution(
    tenantId: string,
    id: string,
  ): Promise<WorkflowExecution> {
    const execution = await this.getExecution(tenantId, id);
    execution.pause();
    const saved = await this.repository.saveExecution(execution, tenantId);
    await this.realtime.emitWorkflowExecutionUpdate(tenantId, saved.toJSON());
    return saved;
  }
}
