import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiWorkflowExecution } from '../domain/entities';
import { WorkflowStatusEnum } from '../domain/value-objects';
import { AIPlatformClient } from './ai-platform.client';
import { AiEventPublisher } from './ai-event.publisher';
import {
  AiWorkflowStartedEvent,
  AiWorkflowCompletedEvent,
  AiWorkflowFailedEvent,
} from '@easydev/shared-events';
import * as crypto from 'crypto';

@Injectable()
export class AiWorkflowService {
  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
    private readonly aiClient: AIPlatformClient,
    private readonly eventPublisher: AiEventPublisher,
  ) {}

  public async triggerWorkflow(
    tenantId: string,
    workflowId: string,
    conversationId: string,
    variables: Record<string, any> = {},
  ): Promise<AiWorkflowExecution> {
    const executionId = crypto.randomUUID();
    const execution = new AiWorkflowExecution(executionId, {
      tenantId,
      workflowId,
      conversationId,
      status: WorkflowStatusEnum.PENDING,
    });

    await this.repository.saveWorkflowExecution(execution, tenantId);

    try {
      execution.start();
      await this.repository.saveWorkflowExecution(execution, tenantId);
      await this.eventPublisher.publish(
        new AiWorkflowStartedEvent(
          tenantId,
          executionId,
          workflowId,
          conversationId,
        ),
      );

      // Run workflow on AI platform
      const result = await this.aiClient.runWorkflow(
        tenantId,
        workflowId,
        conversationId,
        variables,
      );

      const tokensUsed = result.tokensUsed || 0;
      const estimatedCost = result.estimatedCost || 0.0;

      execution.complete(tokensUsed, estimatedCost);
      await this.repository.saveWorkflowExecution(execution, tenantId);
      await this.eventPublisher.publish(
        new AiWorkflowCompletedEvent(
          tenantId,
          executionId,
          workflowId,
          conversationId,
          tokensUsed,
          estimatedCost,
        ),
      );

      return execution;
    } catch (error: any) {
      execution.fail();
      await this.repository.saveWorkflowExecution(execution, tenantId);
      await this.eventPublisher.publish(
        new AiWorkflowFailedEvent(
          tenantId,
          executionId,
          workflowId,
          conversationId,
          error.message,
        ),
      );
      throw error;
    }
  }

  public async getExecution(
    tenantId: string,
    id: string,
  ): Promise<AiWorkflowExecution> {
    const execution = await this.repository.getWorkflowExecutionById(
      id,
      tenantId,
    );
    if (!execution) {
      throw new NotFoundException(`Workflow execution with ID ${id} not found`);
    }
    return execution;
  }

  public async timeoutExecution(tenantId: string, id: string): Promise<void> {
    const execution = await this.getExecution(tenantId, id);
    execution.timeout();
    await this.repository.saveWorkflowExecution(execution, tenantId);
    await this.eventPublisher.publish(
      new AiWorkflowFailedEvent(
        tenantId,
        execution.id,
        execution.workflowId,
        execution.conversationId,
        'Execution timeout',
      ),
    );
  }
}
