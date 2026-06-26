import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WorkflowTriggerService } from './workflow-trigger.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowActionService } from './workflow-action.service';
import { WorkflowAuditService } from './workflow-audit.service';
import { WorkflowTemplateService } from './workflow-template.service';
import {
  ActionTypeEnum,
  TriggerTypeEnum,
  WorkflowStatusEnum,
} from '../domain/value-objects';
import { WorkflowCondition, WorkflowTemplate } from '../domain';
import { QueueService, QUEUES } from '@easydev/shared-queues';

// RR-16: action types whose effects are naturally idempotent under retry (a
// repeat call converges to the same state - doesn't create or send anything
// new). Side-effecting types that could duplicate a real-world action on
// retry (SEND_*, CREATE_TICKET, CALL_CONNECTOR - pending RR-18's own
// connector-level idempotency-key fix, TRIGGER_AI_WORKFLOW, CUSTOM_ACTION)
// are deliberately excluded and keep today's single-attempt, fail-fast
// behavior.
const RETRYABLE_ACTION_TYPES = new Set<ActionTypeEnum>([
  ActionTypeEnum.UPDATE_TICKET,
  ActionTypeEnum.ASSIGN_TICKET,
  ActionTypeEnum.ESCALATE_TICKET,
  ActionTypeEnum.UPDATE_CUSTOMER,
  ActionTypeEnum.ADD_TAG,
  ActionTypeEnum.REMOVE_TAG,
]);
const ACTION_RETRY_BACKOFF_MS = [500, 1500, 3000];

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly triggerService: WorkflowTriggerService,
    private readonly executionService: WorkflowExecutionService,
    @Inject(forwardRef(() => WorkflowActionService))
    private readonly actionService: WorkflowActionService,
    private readonly auditService: WorkflowAuditService,
    private readonly templateService: WorkflowTemplateService,
    private readonly queueService: QueueService,
  ) {}

  // Failed executions were persisted and audit-logged but nobody was ever
  // alerted - a tenant's automation could die with zero operational
  // visibility. Reuses the same admin-incident-job pipeline already wired
  // for connector failures and approval timeouts.
  private async alertExecutionFailure(
    tenantId: string,
    executionId: string,
    templateId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
        tenantId,
        affectedService: 'workflow.execution-failed',
        title: 'Workflow execution failed',
        severity: 'MEDIUM',
        description: `Execution ${executionId} of workflow ${templateId} failed: ${reason}`,
      });
    } catch {
      // Incident visibility is best-effort; failure is already recorded via
      // failExecution + the audit log regardless.
    }
  }

  public async evaluateEventTriggers(
    tenantId: string,
    triggerType: TriggerTypeEnum,
    context: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `Evaluating event triggers for tenant ${tenantId}, triggerType: ${triggerType}`,
    );

    const matchedTemplates = await this.triggerService.findTriggeredTemplates(
      tenantId,
      triggerType,
    );
    this.logger.log(
      `Found ${matchedTemplates.length} matching template(s) for trigger ${triggerType}`,
    );

    for (const template of matchedTemplates) {
      const match = this.evaluateConditions(template.conditions, context);
      if (match) {
        this.logger.log(
          `Conditions matched for template: ${template.name}. Initiating execution.`,
        );
        await this.runWorkflowTemplate(
          tenantId,
          template,
          context,
          triggerType,
        );
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
      triggerReferenceId:
        context.id || context.conversationId || context.ticketId,
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
    this.executeWorkflowActions(
      tenantId,
      template,
      execution.id,
      context,
    ).catch(async (error) => {
      this.logger.error(`Execution ${execution.id} failed: ${error.message}`);
      await this.executionService.failExecution(tenantId, execution.id, {
        message: error.message,
      });
      await this.auditService.logAudit(
        tenantId,
        template.id,
        execution.id,
        'EXECUTION_FAILED',
        `Workflow execution failed: ${error.message}`,
      );
      await this.alertExecutionFailure(
        tenantId,
        execution.id,
        template.id,
        error.message,
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
    this.logger.log(
      `Resuming execution ${executionId} (approved: ${approved})`,
    );

    const execution = await this.executionService.getExecution(
      tenantId,
      executionId,
    );
    const template = await this.templateService.getTemplate(
      tenantId,
      execution.workflowId,
    );

    if (execution.executionStatus !== WorkflowStatusEnum.PAUSED) {
      throw new Error(
        `Workflow execution ${executionId} is not in PAUSED state`,
      );
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

    const remainingActions =
      approvalActionIndex !== -1
        ? template.actions.slice(approvalActionIndex + 1)
        : template.actions;

    this.executeActionsList(
      tenantId,
      remainingActions,
      executionId,
      execution.context,
      template.id,
    ).catch(async (error) => {
      this.logger.error(
        `Resumed execution ${executionId} failed: ${error.message}`,
      );
      await this.executionService.failExecution(tenantId, executionId, {
        message: error.message,
      });
      await this.auditService.logAudit(
        tenantId,
        template.id,
        executionId,
        'EXECUTION_FAILED',
        `Resumed workflow execution failed: ${error.message}`,
      );
      await this.alertExecutionFailure(
        tenantId,
        executionId,
        template.id,
        error.message,
      );
    });
  }

  private evaluateConditions(
    conditions: WorkflowCondition[],
    context: Record<string, any>,
  ): boolean {
    for (const cond of conditions) {
      const actualVal = context[cond.field];
      const targetVal = cond.value;

      switch (cond.operator.toUpperCase()) {
        case 'EQUALS':
          if (String(actualVal) !== String(targetVal)) return false;
          break;
        case 'CONTAINS':
          if (
            !String(actualVal)
              .toLowerCase()
              .includes(String(targetVal).toLowerCase())
          )
            return false;
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
    await this.executeActionsList(
      tenantId,
      template.actions,
      executionId,
      context,
      template.id,
    );
  }

  // RR-16: previously any thrown error from a single action failed the
  // entire execution outright - a transient failure (a momentary DB hiccup,
  // a flaky downstream call) in a single idempotent step required full
  // manual re-triggering of the whole workflow. Retries only the action
  // types in RETRYABLE_ACTION_TYPES; everything else keeps today's single-
  // attempt behavior unchanged.
  private async executeActionWithRetry(
    tenantId: string,
    action: any,
    context: Record<string, any>,
    executionId: string,
    templateId: string,
  ): Promise<any> {
    if (!RETRYABLE_ACTION_TYPES.has(action.actionType)) {
      return this.actionService.executeAction(
        tenantId,
        action,
        context,
        executionId,
      );
    }

    let lastError: any;
    for (
      let attempt = 0;
      attempt <= ACTION_RETRY_BACKOFF_MS.length;
      attempt++
    ) {
      try {
        return await this.actionService.executeAction(
          tenantId,
          action,
          context,
          executionId,
        );
      } catch (error: any) {
        lastError = error;
        if (attempt === ACTION_RETRY_BACKOFF_MS.length) break;

        const delayMs = ACTION_RETRY_BACKOFF_MS[attempt];
        this.logger.warn(
          `Action ${action.actionType} failed on attempt ${attempt + 1}/${ACTION_RETRY_BACKOFF_MS.length + 1} for execution ${executionId}: ${error.message}. Retrying in ${delayMs}ms.`,
        );
        await this.auditService.logAudit(
          tenantId,
          templateId,
          executionId,
          'ACTION_RETRY',
          `Action ${action.actionType} failed (attempt ${attempt + 1}), retrying in ${delayMs}ms: ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
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
      const actionResult = await this.executeActionWithRetry(
        tenantId,
        action,
        context,
        executionId,
        templateId,
      );

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

    await this.executionService.completeExecution(
      tenantId,
      executionId,
      results,
    );
    await this.auditService.logAudit(
      tenantId,
      templateId,
      executionId,
      'EXECUTION_COMPLETED',
      'Workflow execution completed successfully',
    );
  }
}
