import {
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowApproval,
  WorkflowSchedule,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  WorkflowTypeEnum,
  WorkflowStatusEnum,
  TriggerTypeEnum,
  ActionTypeEnum,
  ApprovalStatusEnum,
} from '../domain';

export class WorkflowMapper {
  public static templateToDomain(
    raw: any,
    triggers: any[] = [],
    conditions: any[] = [],
    actions: any[] = [],
    variables: Record<string, { type: string; value: string }> = {},
  ): WorkflowTemplate {
    return new WorkflowTemplate(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      description: raw.description || undefined,
      workflowType: raw.workflowType as WorkflowTypeEnum,
      status: raw.status as WorkflowStatusEnum,
      isSystem: raw.isSystem,
      triggers: triggers.map((t) => this.triggerToDomain(t)),
      conditions: conditions.map((c) => this.conditionToDomain(c)),
      actions: actions.map((a) => this.actionToDomain(a)),
      variables,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static triggerToDomain(raw: any): WorkflowTrigger {
    return new WorkflowTrigger(raw.id, {
      tenantId: raw.tenantId,
      workflowId: raw.workflowId,
      triggerType: raw.triggerType as TriggerTypeEnum,
      configuration: raw.configuration || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static conditionToDomain(raw: any): WorkflowCondition {
    return new WorkflowCondition(raw.id, {
      tenantId: raw.tenantId,
      workflowId: raw.workflowId,
      triggerId: raw.triggerId || undefined,
      field: raw.field,
      operator: raw.operator,
      value: raw.value,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static actionToDomain(raw: any): WorkflowAction {
    return new WorkflowAction(raw.id, {
      tenantId: raw.tenantId,
      workflowId: raw.workflowId,
      actionType: raw.actionType as ActionTypeEnum,
      configuration: raw.configuration || {},
      sequenceOrder: raw.sequenceOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static executionToDomain(raw: any, approvals: any[] = []): WorkflowExecution {
    return new WorkflowExecution(raw.id, {
      tenantId: raw.tenantId,
      workflowId: raw.workflowId,
      executionStatus: raw.executionStatus as WorkflowStatusEnum,
      startedAt: raw.startedAt,
      completedAt: raw.completedAt || undefined,
      executionTimeMs: raw.executionTimeMs,
      triggerSource: raw.triggerSource,
      triggerReferenceId: raw.triggerReferenceId || undefined,
      context: raw.context || {},
      result: raw.result || undefined,
      error: raw.error || undefined,
      approvals: approvals.map((a) => this.approvalToDomain(a)),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static approvalToDomain(raw: any): WorkflowApproval {
    return new WorkflowApproval(raw.id, {
      tenantId: raw.tenantId,
      workflowExecutionId: raw.workflowExecutionId,
      approverId: raw.approverId,
      approvalStatus: raw.approvalStatus as ApprovalStatusEnum,
      comments: raw.comments || undefined,
      approvedAt: raw.approvedAt || undefined,
      expiresAt: raw.expiresAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static scheduleToDomain(raw: any): WorkflowSchedule {
    return new WorkflowSchedule(raw.id, {
      tenantId: raw.tenantId,
      workflowId: raw.workflowId,
      cronExpression: raw.cronExpression,
      timezone: raw.timezone,
      nextRunAt: raw.nextRunAt || undefined,
      lastRunAt: raw.lastRunAt || undefined,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
