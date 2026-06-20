import {
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowApproval,
  WorkflowSchedule,
} from '../domain';

export interface IWorkflowRepository {
  // Workflow Templates
  saveTemplate(
    template: WorkflowTemplate,
    tenantId: string,
  ): Promise<WorkflowTemplate>;
  getTemplateById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowTemplate | null>;
  findTemplates(
    tenantId: string,
    options?: { status?: string; type?: string },
  ): Promise<WorkflowTemplate[]>;
  deleteTemplate(id: string, tenantId: string): Promise<boolean>;

  // Workflow Executions
  saveExecution(
    execution: WorkflowExecution,
    tenantId: string,
  ): Promise<WorkflowExecution>;
  getExecutionById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowExecution | null>;
  findExecutions(
    tenantId: string,
    options?: { workflowId?: string; status?: string },
  ): Promise<WorkflowExecution[]>;

  // Workflow Approvals
  saveApproval(
    approval: WorkflowApproval,
    tenantId: string,
  ): Promise<WorkflowApproval>;
  getApprovalById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowApproval | null>;
  findApprovalsByExecutionId(
    executionId: string,
    tenantId: string,
  ): Promise<WorkflowApproval[]>;

  // Workflow Schedules
  saveSchedule(
    schedule: WorkflowSchedule,
    tenantId: string,
  ): Promise<WorkflowSchedule>;
  getScheduleById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowSchedule | null>;
  findSchedules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<WorkflowSchedule[]>;
  deleteSchedule(id: string, tenantId: string): Promise<boolean>;

  // Workflow Audit Logs
  logAudit(
    log: {
      workflowId?: string;
      workflowExecutionId?: string;
      action: string;
      details?: string;
      metadata?: any;
    },
    tenantId: string,
  ): Promise<void>;
  findAuditLogs(
    tenantId: string,
    workflowId?: string,
    executionId?: string,
  ): Promise<any[]>;

  // Workflow Versions
  saveVersion(
    version: {
      templateId: string;
      versionNumber: number;
      definition: any;
      isActive: boolean;
    },
    tenantId: string,
  ): Promise<void>;
  getActiveVersion(templateId: string, tenantId: string): Promise<any | null>;

  // Workflow Variables
  saveVariable(
    workflowId: string,
    name: string,
    type: string,
    value: string,
    tenantId: string,
  ): Promise<void>;
  getVariables(
    workflowId: string,
    tenantId: string,
  ): Promise<Record<string, { type: string; value: string }>>;
}
