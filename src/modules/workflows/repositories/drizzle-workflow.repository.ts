import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, desc, asc, lte } from 'drizzle-orm';
import { IWorkflowRepository } from './workflow-repository.interface';
import {
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowApproval,
  WorkflowSchedule,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
} from '../domain';
import { WorkflowMapper } from './workflow.mapper';

@Injectable()
export class DrizzleWorkflowRepository implements IWorkflowRepository {
  // ------------------ Workflow Templates ------------------
  public async saveTemplate(
    template: WorkflowTemplate,
    tenantId: string,
  ): Promise<WorkflowTemplate> {
    const rawTemplate = {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description || null,
      workflowType: template.workflowType,
      status: template.status,
      isSystem: template.isSystem,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.workflowTemplates)
      .where(
        and(
          eq(schema.workflowTemplates.id, template.id),
          eq(schema.workflowTemplates.tenantId, tenantId),
        ),
      );

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(schema.workflowTemplates)
          .set(rawTemplate)
          .where(
            and(
              eq(schema.workflowTemplates.id, template.id),
              eq(schema.workflowTemplates.tenantId, tenantId),
            ),
          );
      } else {
        await tx
          .insert(schema.workflowTemplates)
          .values({ ...rawTemplate, createdAt: template.createdAt });
      }

      // Re-sync Triggers (Clear existing and insert new ones)
      await tx
        .delete(schema.workflowTriggers)
        .where(
          and(
            eq(schema.workflowTriggers.workflowId, template.id),
            eq(schema.workflowTriggers.tenantId, tenantId),
          ),
        );

      for (const trigger of template.triggers) {
        const rawTrigger = {
          id: trigger.id,
          tenantId: trigger.tenantId,
          workflowId: trigger.workflowId,
          triggerType: trigger.triggerType,
          configuration: trigger.configuration || null,
          updatedAt: new Date(),
        };
        await tx
          .insert(schema.workflowTriggers)
          .values({ ...rawTrigger, createdAt: trigger.createdAt });
      }

      // Re-sync Conditions
      await tx
        .delete(schema.workflowConditions)
        .where(
          and(
            eq(schema.workflowConditions.workflowId, template.id),
            eq(schema.workflowConditions.tenantId, tenantId),
          ),
        );

      for (const cond of template.conditions) {
        const rawCond = {
          id: cond.id,
          tenantId: cond.tenantId,
          workflowId: cond.workflowId,
          triggerId: cond.triggerId || null,
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
          updatedAt: new Date(),
        };
        await tx
          .insert(schema.workflowConditions)
          .values({ ...rawCond, createdAt: cond.createdAt });
      }

      // Re-sync Actions
      await tx
        .delete(schema.workflowActions)
        .where(
          and(
            eq(schema.workflowActions.workflowId, template.id),
            eq(schema.workflowActions.tenantId, tenantId),
          ),
        );

      for (const action of template.actions) {
        const rawAction = {
          id: action.id,
          tenantId: action.tenantId,
          workflowId: action.workflowId,
          actionType: action.actionType,
          configuration: action.configuration,
          sequenceOrder: action.sequenceOrder,
          updatedAt: new Date(),
        };
        await tx
          .insert(schema.workflowActions)
          .values({ ...rawAction, createdAt: action.createdAt });
      }

      // Sync Variables
      await tx
        .delete(schema.workflowVariables)
        .where(
          and(
            eq(schema.workflowVariables.workflowId, template.id),
            eq(schema.workflowVariables.tenantId, tenantId),
          ),
        );

      for (const [name, variable] of Object.entries(template.variables)) {
        await tx.insert(schema.workflowVariables).values({
          id: crypto.randomUUID(),
          tenantId,
          workflowId: template.id,
          name,
          type: variable.type,
          value: variable.value,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    return template;
  }

  public async getTemplateById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowTemplate | null> {
    const [raw] = await db
      .select()
      .from(schema.workflowTemplates)
      .where(
        and(
          eq(schema.workflowTemplates.id, id),
          eq(schema.workflowTemplates.tenantId, tenantId),
        ),
      );

    if (!raw) return null;

    const triggers = await db
      .select()
      .from(schema.workflowTriggers)
      .where(
        and(
          eq(schema.workflowTriggers.workflowId, id),
          eq(schema.workflowTriggers.tenantId, tenantId),
        ),
      );

    const conditions = await db
      .select()
      .from(schema.workflowConditions)
      .where(
        and(
          eq(schema.workflowConditions.workflowId, id),
          eq(schema.workflowConditions.tenantId, tenantId),
        ),
      );

    const actions = await db
      .select()
      .from(schema.workflowActions)
      .where(
        and(
          eq(schema.workflowActions.workflowId, id),
          eq(schema.workflowActions.tenantId, tenantId),
        ),
      )
      .orderBy(asc(schema.workflowActions.sequenceOrder));

    const variablesMap = await this.getVariables(id, tenantId);

    return WorkflowMapper.templateToDomain(
      raw,
      triggers,
      conditions,
      actions,
      variablesMap,
    );
  }

  public async findTemplates(
    tenantId: string,
    options?: { status?: string; type?: string },
  ): Promise<WorkflowTemplate[]> {
    const conditions = [eq(schema.workflowTemplates.tenantId, tenantId)];
    if (options?.status) {
      conditions.push(eq(schema.workflowTemplates.status, options.status));
    }
    if (options?.type) {
      conditions.push(eq(schema.workflowTemplates.workflowType, options.type));
    }

    const rows = await db
      .select()
      .from(schema.workflowTemplates)
      .where(and(...conditions));

    const templates: WorkflowTemplate[] = [];
    for (const raw of rows) {
      const triggers = await db
        .select()
        .from(schema.workflowTriggers)
        .where(
          and(
            eq(schema.workflowTriggers.workflowId, raw.id),
            eq(schema.workflowTriggers.tenantId, tenantId),
          ),
        );

      const conditions = await db
        .select()
        .from(schema.workflowConditions)
        .where(
          and(
            eq(schema.workflowConditions.workflowId, raw.id),
            eq(schema.workflowConditions.tenantId, tenantId),
          ),
        );

      const actions = await db
        .select()
        .from(schema.workflowActions)
        .where(
          and(
            eq(schema.workflowActions.workflowId, raw.id),
            eq(schema.workflowActions.tenantId, tenantId),
          ),
        )
        .orderBy(asc(schema.workflowActions.sequenceOrder));

      const variablesMap = await this.getVariables(raw.id, tenantId);

      templates.push(
        WorkflowMapper.templateToDomain(
          raw,
          triggers,
          conditions,
          actions,
          variablesMap,
        ),
      );
    }

    return templates;
  }

  public async deleteTemplate(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.workflowTemplates)
      .where(
        and(
          eq(schema.workflowTemplates.id, id),
          eq(schema.workflowTemplates.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .delete(schema.workflowTemplates)
      .where(
        and(
          eq(schema.workflowTemplates.id, id),
          eq(schema.workflowTemplates.tenantId, tenantId),
        ),
      );

    return true;
  }

  // ------------------ Workflow Executions ------------------
  public async saveExecution(
    execution: WorkflowExecution,
    tenantId: string,
  ): Promise<WorkflowExecution> {
    const raw = {
      id: execution.id,
      tenantId: execution.tenantId,
      workflowId: execution.workflowId,
      executionStatus: execution.executionStatus,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt || null,
      executionTimeMs: execution.executionTimeMs,
      triggerSource: execution.triggerSource,
      triggerReferenceId: execution.triggerReferenceId || null,
      context: execution.context,
      result: execution.result || null,
      error: execution.error || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.workflowExecutions)
      .where(
        and(
          eq(schema.workflowExecutions.id, execution.id),
          eq(schema.workflowExecutions.tenantId, tenantId),
        ),
      );

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(schema.workflowExecutions)
          .set(raw)
          .where(
            and(
              eq(schema.workflowExecutions.id, execution.id),
              eq(schema.workflowExecutions.tenantId, tenantId),
            ),
          );
      } else {
        await tx
          .insert(schema.workflowExecutions)
          .values({ ...raw, createdAt: execution.createdAt });
      }

      // Sync approvals
      for (const app of execution.approvals) {
        const rawApp = {
          id: app.id,
          tenantId: app.tenantId,
          workflowExecutionId: app.workflowExecutionId,
          approverId: app.approverId,
          approvalStatus: app.approvalStatus,
          comments: app.comments || null,
          approvedAt: app.approvedAt || null,
          expiresAt: app.expiresAt || null,
          updatedAt: new Date(),
        };

        const [existingApp] = await tx
          .select()
          .from(schema.workflowApprovals)
          .where(
            and(
              eq(schema.workflowApprovals.id, app.id),
              eq(schema.workflowApprovals.tenantId, tenantId),
            ),
          );

        if (existingApp) {
          await tx
            .update(schema.workflowApprovals)
            .set(rawApp)
            .where(
              and(
                eq(schema.workflowApprovals.id, app.id),
                eq(schema.workflowApprovals.tenantId, tenantId),
              ),
            );
        } else {
          await tx
            .insert(schema.workflowApprovals)
            .values({ ...rawApp, createdAt: app.createdAt });
        }
      }
    });

    return execution;
  }

  public async getExecutionById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowExecution | null> {
    const [raw] = await db
      .select()
      .from(schema.workflowExecutions)
      .where(
        and(
          eq(schema.workflowExecutions.id, id),
          eq(schema.workflowExecutions.tenantId, tenantId),
        ),
      );

    if (!raw) return null;

    const approvals = await db
      .select()
      .from(schema.workflowApprovals)
      .where(
        and(
          eq(schema.workflowApprovals.workflowExecutionId, id),
          eq(schema.workflowApprovals.tenantId, tenantId),
        ),
      );

    return WorkflowMapper.executionToDomain(raw, approvals);
  }

  public async findExecutions(
    tenantId: string,
    options?: { workflowId?: string; status?: string },
  ): Promise<WorkflowExecution[]> {
    const conditions = [eq(schema.workflowExecutions.tenantId, tenantId)];
    if (options?.workflowId) {
      conditions.push(
        eq(schema.workflowExecutions.workflowId, options.workflowId),
      );
    }
    if (options?.status) {
      conditions.push(
        eq(schema.workflowExecutions.executionStatus, options.status),
      );
    }

    const rows = await db
      .select()
      .from(schema.workflowExecutions)
      .where(and(...conditions))
      .orderBy(desc(schema.workflowExecutions.startedAt));

    const executions: WorkflowExecution[] = [];
    for (const raw of rows) {
      const approvals = await db
        .select()
        .from(schema.workflowApprovals)
        .where(
          and(
            eq(schema.workflowApprovals.workflowExecutionId, raw.id),
            eq(schema.workflowApprovals.tenantId, tenantId),
          ),
        );
      executions.push(WorkflowMapper.executionToDomain(raw, approvals));
    }

    return executions;
  }

  // ------------------ Workflow Approvals ------------------
  public async saveApproval(
    approval: WorkflowApproval,
    tenantId: string,
  ): Promise<WorkflowApproval> {
    const raw = {
      id: approval.id,
      tenantId: approval.tenantId,
      workflowExecutionId: approval.workflowExecutionId,
      approverId: approval.approverId,
      approvalStatus: approval.approvalStatus,
      comments: approval.comments || null,
      approvedAt: approval.approvedAt || null,
      expiresAt: approval.expiresAt || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.workflowApprovals)
      .where(
        and(
          eq(schema.workflowApprovals.id, approval.id),
          eq(schema.workflowApprovals.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.workflowApprovals)
        .set(raw)
        .where(
          and(
            eq(schema.workflowApprovals.id, approval.id),
            eq(schema.workflowApprovals.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.workflowApprovals)
        .values({ ...raw, createdAt: approval.createdAt });
    }

    return approval;
  }

  public async getApprovalById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowApproval | null> {
    const [raw] = await db
      .select()
      .from(schema.workflowApprovals)
      .where(
        and(
          eq(schema.workflowApprovals.id, id),
          eq(schema.workflowApprovals.tenantId, tenantId),
        ),
      );

    if (!raw) return null;
    return WorkflowMapper.approvalToDomain(raw);
  }

  public async findApprovalsByExecutionId(
    executionId: string,
    tenantId: string,
  ): Promise<WorkflowApproval[]> {
    const rows = await db
      .select()
      .from(schema.workflowApprovals)
      .where(
        and(
          eq(schema.workflowApprovals.workflowExecutionId, executionId),
          eq(schema.workflowApprovals.tenantId, tenantId),
        ),
      );

    return rows.map((r) => WorkflowMapper.approvalToDomain(r));
  }

  // Cross-tenant sweep when tenantId is omitted, mirroring
  // findDueSlas's/findOfflineAgents's optional-tenantId pattern.
  public async findExpiredPendingApprovals(
    tenantId: string | undefined,
    now: Date,
  ): Promise<WorkflowApproval[]> {
    const conditions = [
      eq(schema.workflowApprovals.approvalStatus, 'PENDING'),
      lte(schema.workflowApprovals.expiresAt, now),
    ];
    if (tenantId) conditions.push(eq(schema.workflowApprovals.tenantId, tenantId));

    const rows = await db
      .select()
      .from(schema.workflowApprovals)
      .where(and(...conditions));

    return rows.map((r) => WorkflowMapper.approvalToDomain(r));
  }

  // ------------------ Workflow Schedules ------------------
  public async saveSchedule(
    schedule: WorkflowSchedule,
    tenantId: string,
  ): Promise<WorkflowSchedule> {
    const raw = {
      id: schedule.id,
      tenantId: schedule.tenantId,
      workflowId: schedule.workflowId,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      nextRunAt: schedule.nextRunAt || null,
      lastRunAt: schedule.lastRunAt || null,
      isActive: schedule.isActive,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.workflowSchedules)
      .where(
        and(
          eq(schema.workflowSchedules.id, schedule.id),
          eq(schema.workflowSchedules.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.workflowSchedules)
        .set(raw)
        .where(
          and(
            eq(schema.workflowSchedules.id, schedule.id),
            eq(schema.workflowSchedules.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.workflowSchedules)
        .values({ ...raw, createdAt: schedule.createdAt });
    }

    return schedule;
  }

  public async getScheduleById(
    id: string,
    tenantId: string,
  ): Promise<WorkflowSchedule | null> {
    const [raw] = await db
      .select()
      .from(schema.workflowSchedules)
      .where(
        and(
          eq(schema.workflowSchedules.id, id),
          eq(schema.workflowSchedules.tenantId, tenantId),
        ),
      );

    if (!raw) return null;
    return WorkflowMapper.scheduleToDomain(raw);
  }

  public async findSchedules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<WorkflowSchedule[]> {
    const conditions = [eq(schema.workflowSchedules.tenantId, tenantId)];
    if (activeOnly) {
      conditions.push(eq(schema.workflowSchedules.isActive, true));
    }

    const rows = await db
      .select()
      .from(schema.workflowSchedules)
      .where(and(...conditions));

    return rows.map((r) => WorkflowMapper.scheduleToDomain(r));
  }

  public async deleteSchedule(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.workflowSchedules)
      .where(
        and(
          eq(schema.workflowSchedules.id, id),
          eq(schema.workflowSchedules.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .delete(schema.workflowSchedules)
      .where(
        and(
          eq(schema.workflowSchedules.id, id),
          eq(schema.workflowSchedules.tenantId, tenantId),
        ),
      );

    return true;
  }

  // ------------------ Workflow Audit Logs ------------------
  public async logAudit(
    log: {
      workflowId?: string;
      workflowExecutionId?: string;
      action: string;
      details?: string;
      metadata?: any;
    },
    tenantId: string,
  ): Promise<void> {
    await db.insert(schema.workflowAuditLogs).values({
      id: crypto.randomUUID(),
      tenantId,
      workflowId: log.workflowId || null,
      workflowExecutionId: log.workflowExecutionId || null,
      action: log.action,
      details: log.details || null,
      metadata: log.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public async findAuditLogs(
    tenantId: string,
    workflowId?: string,
    executionId?: string,
  ): Promise<any[]> {
    const conditions = [eq(schema.workflowAuditLogs.tenantId, tenantId)];
    if (workflowId) {
      conditions.push(eq(schema.workflowAuditLogs.workflowId, workflowId));
    }
    if (executionId) {
      conditions.push(
        eq(schema.workflowAuditLogs.workflowExecutionId, executionId),
      );
    }

    return db
      .select()
      .from(schema.workflowAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(schema.workflowAuditLogs.createdAt));
  }

  // ------------------ Workflow Versions ------------------
  public async saveVersion(
    version: {
      templateId: string;
      versionNumber: number;
      definition: any;
      isActive: boolean;
    },
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: crypto.randomUUID(),
      tenantId,
      workflowTemplateId: version.templateId,
      versionNumber: version.versionNumber,
      definition: version.definition,
      isActive: version.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (version.isActive) {
      // Deactivate other versions for this template first
      await db
        .update(schema.workflowVersions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.workflowVersions.workflowTemplateId, version.templateId),
            eq(schema.workflowVersions.tenantId, tenantId),
          ),
        );
    }

    await db.insert(schema.workflowVersions).values(raw);
  }

  public async getActiveVersion(
    templateId: string,
    tenantId: string,
  ): Promise<any | null> {
    const [row] = await db
      .select()
      .from(schema.workflowVersions)
      .where(
        and(
          eq(schema.workflowVersions.workflowTemplateId, templateId),
          eq(schema.workflowVersions.isActive, true),
          eq(schema.workflowVersions.tenantId, tenantId),
        ),
      );

    return row || null;
  }

  // ------------------ Workflow Variables ------------------
  public async saveVariable(
    workflowId: string,
    name: string,
    type: string,
    value: string,
    tenantId: string,
  ): Promise<void> {
    const [existing] = await db
      .select()
      .from(schema.workflowVariables)
      .where(
        and(
          eq(schema.workflowVariables.workflowId, workflowId),
          eq(schema.workflowVariables.name, name),
          eq(schema.workflowVariables.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.workflowVariables)
        .set({ type, value, updatedAt: new Date() })
        .where(
          and(
            eq(schema.workflowVariables.workflowId, workflowId),
            eq(schema.workflowVariables.name, name),
            eq(schema.workflowVariables.tenantId, tenantId),
          ),
        );
    } else {
      await db.insert(schema.workflowVariables).values({
        id: crypto.randomUUID(),
        tenantId,
        workflowId,
        name,
        type,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  public async getVariables(
    workflowId: string,
    tenantId: string,
  ): Promise<Record<string, { type: string; value: string }>> {
    const rows = await db
      .select()
      .from(schema.workflowVariables)
      .where(
        and(
          eq(schema.workflowVariables.workflowId, workflowId),
          eq(schema.workflowVariables.tenantId, tenantId),
        ),
      );

    const variablesMap: Record<string, { type: string; value: string }> = {};
    for (const r of rows) {
      variablesMap[r.name] = { type: r.type, value: r.value || '' };
    }
    return variablesMap;
  }
}
