import { Injectable, Logger, Inject } from '@nestjs/common';
import { WorkflowTriggerService } from './workflow-trigger.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowActionService } from './workflow-action.service';
import { WorkflowAuditService } from './workflow-audit.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { TriggerTypeEnum, WorkflowStatusEnum } from '../domain/value-objects';
import { WorkflowCondition, WorkflowTemplate } from '../domain';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly triggerService: WorkflowTriggerService,
    private readonly executionService: WorkflowExecutionService,
    private readonly actionService: WorkflowActionService,
    private readonly auditService: WorkflowAuditService,
    private readonly templateService: WorkflowTemplateService,
  ) {}

  public async evaluateEventTriggers(
    tenantId: string,
    triggerType: TriggerTypeEnum,
    context: Record<string, any>,
  ): Promise<void> {
    this.logger.log(`Evaluating event triggers for tenant ${tenantId}, triggerType: ${triggerType}`);

    const matchedTemplates = await this.triggerService.findTriggeredTemplates(tenantId, triggerType);
    this.logger.log(`Found ${matchedTemplates.length} matching template(s) for trigger ${triggerType}`);

    for (const template of matchedTemplates) {
      const match = this.evaluateConditions(template.conditions, context);
      if (match) {
        this.logger.log(`Conditions matched for template: ${template.name}. Initiating execution.`);
        await this.runWorkflowTemplate(tenantId, template, context, triggerType);
      }
    }
  }

  public async runWorkflowTemplate(
    tenantId: string,
    template: WorkflowTemplate,
    context: Record<string, any>,
    triggerSource: string,
  ): Promise<string> {
    const execution = await this.executionService.createExecution(tenantId, {
      workflowId: template.id,
      triggerSource,
      triggerReferenceId: context.id || context.conversationId || context.ticketId,
      context,
    });

    await this.executionService.startExecution(tenantId, execution.id);
    await this.auditService.logAudit(
      tenantId,
      template.id,
      execution.id,
      'EXECUTION_STARTED',
      `Workflow execution started by trigger source ${triggerSource}`,
    );

    // Run actions asynchronously in background, catching errors
    this.executeWorkflowActions(tenantId, template, execution.id, context).catch(async (error) => {
      this.logger.error(`Execution ${execution.id} failed: ${error.message}`);
      await this.executionService.failExecution(tenantId, execution.id, { message: error.message });
      await this.auditService.logAudit(
        tenantId,
        template.id,
        execution.id,
        'EXECUTION_FAILED',
        `Workflow execution failed: ${error.message}`,
      );
    });

    return execution.id;
  }

  public async resumeExecution(
    tenantId: string,
    executionId: string,
    approved: boolean,
    approverId: string,
    comments?: string,
  ): Promise<void> {
    this.logger.log(`Resuming execution ${executionId} (approved: ${approved})`);

    const execution = await this.executionService.getExecution(tenantId, executionId);
    const template = await this.templateService.getTemplate(tenantId, execution.workflowId);

    if (execution.executionStatus !== WorkflowStatusEnum.PAUSED) {
      throw new Error(`Workflow execution ${executionId} is not in PAUSED state`);
    }

    if (!approved) {
      await this.executionService.failExecution(tenantId, executionId, {
        message: 'Approval rejected by approver',
        approverId,
        comments,
      });
      await this.auditService.logAudit(
        tenantId,
        template.id,
        executionId,
        'APPROVAL_REJECTED',
        `Workflow rejected by approver ${approverId}. execution terminated.`,
      );
      return;
    }

    await this.executionService.startExecution(tenantId, executionId);
    await this.auditService.logAudit(
      tenantId,
      template.id,
      executionId,
      'APPROVAL_GRANTED',
      `Workflow approved by approver ${approverId}. Resuming execution.`,
    );

    // Find the index of the approval action step to resume from next step
    const approvalActionIndex = template.actions.findIndex(
      (a) => a.actionType === 'APPROVAL', // Resume after approval
    );

    const remainingActions = approvalActionIndex !== -1 
      ? template.actions.slice(approvalActionIndex + 1) 
      : template.actions;

    this.executeActionsList(tenantId, remainingActions, executionId, execution.context, template.id).catch(async (error) => {
      this.logger.error(`Resumed execution ${executionId} failed: ${error.message}`);
      await this.executionService.failExecution(tenantId, executionId, { message: error.message });
      await this.auditService.logAudit(
        tenantId,
        template.id,
        executionId,
        'EXECUTION_FAILED',
        `Resumed workflow execution failed: ${error.message}`,
      );
    });
  }

  private evaluateConditions(conditions: WorkflowCondition[], context: Record<string, any>): boolean {
    for (const cond of conditions) {
      const actualVal = context[cond.field];
      const targetVal = cond.value;

      switch (cond.operator.toUpperCase()) {
        case 'EQUALS':
          if (String(actualVal) !== String(targetVal)) return false;
          break;
        case 'CONTAINS':
          if (!String(actualVal).toLowerCase().includes(String(targetVal).toLowerCase())) return false;
          break;
        case 'GT':
          if (Number(actualVal) <= Number(targetVal)) return false;
          break;
        case 'LT':
          if (Number(actualVal) >= Number(targetVal)) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }

  private async executeWorkflowActions(
    tenantId: string,
    template: WorkflowTemplate,
    executionId: string,
    context: Record<string, any>,
  ): Promise<void> {
    await this.executeActionsList(tenantId, template.actions, executionId, context, template.id);
  }

  private async executeActionsList(
    tenantId: string,
    actionsList: any[],
    executionId: string,
    context: Record<string, any>,
    templateId: string,
  ): Promise<void> {
    const results: Record<string, any> = {};

    for (const action of actionsList) {
      const actionResult = await this.actionService.executeAction(tenantId, action, context, executionId);
      
      results[action.id || action.sequenceOrder] = actionResult;

      if (actionResult && actionResult.paused) {
        // Pause execution for Approval
        await this.executionService.pauseExecution(tenantId, executionId);
        await this.auditService.logAudit(
          tenantId,
          templateId,
          executionId,
          'EXECUTION_PAUSED',
          `Execution paused for step approval: ${action.actionType}`,
        );
        return;
      }
    }

    await this.executionService.completeExecution(tenantId, executionId, results);
    await this.auditService.logAudit(
      tenantId,
      templateId,
      executionId,
      'EXECUTION_COMPLETED',
      'Workflow execution completed successfully',
    );
  }
}
