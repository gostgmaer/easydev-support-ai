import { DrizzleWorkflowRepository } from '../repositories/drizzle-workflow.repository';
import {
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowApproval,
  WorkflowSchedule,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
} from '../domain/entities';
import {
  WorkflowStatusEnum,
  WorkflowTypeEnum,
  TriggerTypeEnum,
  ActionTypeEnum,
  ApprovalStatusEnum,
} from '../domain/value-objects';

let mockResults: any[] = [];

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  then: jest.fn((resolve) => {
    const res = mockResults.length > 0 ? mockResults.shift() : [];
    resolve(res);
  }),
};

jest.mock('@easydev/database', () => {
  return {
    db: {
      select: jest.fn(() => queryBuilder),
      insert: jest.fn(() => queryBuilder),
      update: jest.fn(() => queryBuilder),
      delete: jest.fn(() => queryBuilder),
      transaction: jest.fn((cb) => cb(queryBuilder)),
    },
    schema: {
      workflowTemplates: { id: 'workflowTemplates.id', tenantId: 'workflowTemplates.tenantId' },
      workflowVersions: { id: 'workflowVersions.id', tenantId: 'workflowVersions.tenantId' },
      workflowExecutions: { id: 'workflowExecutions.id', tenantId: 'workflowExecutions.tenantId' },
      workflowTriggers: { id: 'workflowTriggers.id', tenantId: 'workflowTriggers.tenantId' },
      workflowConditions: { id: 'workflowConditions.id', tenantId: 'workflowConditions.tenantId' },
      workflowActions: { id: 'workflowActions.id', tenantId: 'workflowActions.tenantId' },
      workflowApprovals: { id: 'workflowApprovals.id', tenantId: 'workflowApprovals.tenantId' },
      workflowSchedules: { id: 'workflowSchedules.id', tenantId: 'workflowSchedules.tenantId' },
      workflowAuditLogs: { id: 'workflowAuditLogs.id', tenantId: 'workflowAuditLogs.tenantId' },
      workflowVariables: { id: 'workflowVariables.id', tenantId: 'workflowVariables.tenantId' },
    },
  };
});

describe('Workflow Orchestration Drizzle Repository', () => {
  let repo: DrizzleWorkflowRepository;
  const tenantId = 'tenant-123';
  const workflowId = 'workflow-123';
  const executionId = 'exec-123';
  const approvalId = 'approval-123';
  const scheduleId = 'schedule-123';

  beforeEach(() => {
    repo = new DrizzleWorkflowRepository();
    mockResults = [];
    jest.clearAllMocks();
  });

  describe('Workflow Templates', () => {
    it('should save and update a template aggregate along with triggers, conditions, and actions', async () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Refund Request VIP',
        workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
        triggers: [
          new WorkflowTrigger('trigger-1', {
            tenantId,
            workflowId,
            triggerType: TriggerTypeEnum.TICKET_CREATED,
          }),
        ],
        conditions: [
          new WorkflowCondition('cond-1', {
            tenantId,
            workflowId,
            field: 'priority',
            operator: 'EQUALS',
            value: 'HIGH',
          }),
        ],
        actions: [
          new WorkflowAction('action-1', {
            tenantId,
            workflowId,
            actionType: ActionTypeEnum.ESCALATE_TICKET,
            configuration: { reason: 'VIP SLA target alert' },
            sequenceOrder: 1,
          }),
        ],
        variables: {},
      });

      // Mock select template query (exists)
      mockResults.push([{ id: workflowId }]); // for template check
      mockResults.push([]); // delete triggers
      mockResults.push([]); // delete conditions
      mockResults.push([]); // delete actions
      mockResults.push([]); // delete variables

      const saved = await repo.saveTemplate(template, tenantId);
      expect(saved.id).toBe(workflowId);
    });

    it('should retrieve a template by ID', async () => {
      // Mock db queries to return template and relation rows
      mockResults.push([{
        id: workflowId,
        tenantId,
        name: 'VIP Escalation',
        workflowType: 'ESCALATION_WORKFLOW',
        status: 'ACTIVE',
        isSystem: true,
      }]);
      mockResults.push([]); // triggers
      mockResults.push([]); // conditions
      mockResults.push([]); // actions
      mockResults.push([]); // variables

      const template = await repo.getTemplateById(workflowId, tenantId);
      expect(template).toBeDefined();
      expect(template?.id).toBe(workflowId);
      expect(template?.name).toBe('VIP Escalation');
    });

    it('should delete a template', async () => {
      mockResults.push([{ id: workflowId }]); // template row delete return
      const deleted = await repo.deleteTemplate(workflowId, tenantId);
      expect(deleted).toBe(true);
    });
  });

  describe('Workflow Executions', () => {
    it('should save and retrieve executions', async () => {
      const execution = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.ACTIVE,
        triggerSource: 'MANUAL',
        context: { amount: 200 },
        approvals: [],
      });

      mockResults.push([{ id: executionId }]); // check exists
      mockResults.push([]); // delete approvals

      const saved = await repo.saveExecution(execution, tenantId);
      expect(saved.id).toBe(executionId);

      // retrieve mock
      mockResults.push([{
        id: executionId,
        tenantId,
        workflowId,
        executionStatus: 'ACTIVE',
        triggerSource: 'MANUAL',
        context: { amount: 200 },
      }]);
      mockResults.push([]); // approvals

      const retrieved = await repo.getExecutionById(executionId, tenantId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(executionId);
    });
  });

  describe('Workflow Approvals', () => {
    it('should save and find approvals', async () => {
      const approval = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'user-manager-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
      });

      mockResults.push([{ id: approvalId }]); // exists check

      const saved = await repo.saveApproval(approval, tenantId);
      expect(saved.id).toBe(approvalId);

      // find approvals by execution ID mock
      mockResults.push([{
        id: approvalId,
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'user-manager-1',
        approvalStatus: 'PENDING',
      }]);

      const list = await repo.findApprovalsByExecutionId(executionId, tenantId);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(approvalId);
    });
  });

  describe('Workflow Schedules', () => {
    it('should save and retrieve schedules', async () => {
      const schedule = new WorkflowSchedule(scheduleId, {
        tenantId,
        workflowId,
        cronExpression: '0 9 * * 1-5',
        timezone: 'America/New_York',
        isActive: true,
      });

      mockResults.push([{ id: scheduleId }]); // exists check

      const saved = await repo.saveSchedule(schedule, tenantId);
      expect(saved.id).toBe(scheduleId);

      // get schedule by id mock
      mockResults.push([{
        id: scheduleId,
        tenantId,
        workflowId,
        cronExpression: '0 9 * * 1-5',
        timezone: 'America/New_York',
        isActive: true,
      }]);

      const retrieved = await repo.getScheduleById(scheduleId, tenantId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(scheduleId);
    });
  });
});
