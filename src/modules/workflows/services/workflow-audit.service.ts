import { Injectable, Inject } from '@nestjs/common';
import type { IWorkflowRepository } from '../repositories/workflow-repository.interface';

@Injectable()
export class WorkflowAuditService {
  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
  ) {}

  public async logAudit(
    tenantId: string,
    workflowId: string | undefined,
    executionId: string | undefined,
    action: string,
    details?: string,
    metadata?: any,
  ): Promise<void> {
    await this.repository.logAudit(
      {
        workflowId,
        workflowExecutionId: executionId,
        action,
        details,
        metadata,
      },
      tenantId,
    );
  }

  public async getAuditLogs(
    tenantId: string,
    workflowId?: string,
    executionId?: string,
  ): Promise<any[]> {
    return this.repository.findAuditLogs(tenantId, workflowId, executionId);
  }
}
