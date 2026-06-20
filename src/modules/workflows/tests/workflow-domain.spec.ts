import {
  WorkflowId,
  WorkflowExecutionId,
  WorkflowStatusEnum,
  WorkflowTypeEnum,
  TriggerTypeEnum,
  ActionTypeEnum,
  ApprovalStatusEnum,
} from '../domain/value-objects';
import {
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowApproval,
  WorkflowSchedule,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
} from '../domain/entities';

describe('Workflow Orchestration Domain Model', () => {
  const tenantId = '00000000-0000-0000-0000-000000000000';
  const workflowId = 'workflow-uuid-1';
  const executionId = 'execution-uuid-1';

  describe('Value Objects', () => {
    it('should create valid WorkflowId', () => {
      const vo = WorkflowId.create(workflowId);
      expect(vo.value).toBe(workflowId);
    });

    it('should throw on empty WorkflowId', () => {
      expect(() => WorkflowId.create('')).toThrow('WorkflowId cannot be empty');
    });

    it('should create valid WorkflowExecutionId', () => {
      const vo = WorkflowExecutionId.create(executionId);
      expect(vo.value).toBe(executionId);
    });

    it('should throw on empty WorkflowExecutionId', () => {
      expect(() => WorkflowExecutionId.create('')).toThrow('WorkflowExecutionId cannot be empty');
    });
  });

  describe('WorkflowTemplate Aggregate', () => {
    it('should create, update, publish and serialize a template', () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Refund Template',
        description: 'Handles refund templates',
        workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        status: WorkflowStatusEnum.DRAFT,
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
            field: 'amount',
            operator: 'GT',
            value: '100',
          }),
        ],
        actions: [
          new WorkflowAction('action-1', {
            tenantId,
            workflowId,
            actionType: ActionTypeEnum.APPROVAL,
            configuration: { approverId: 'user-1' },
            sequenceOrder: 1,
          }),
        ],
        variables: {},
      });

      expect(template.id).toBe(workflowId);
      expect(template.name).toBe('Refund Template');
      expect(template.version).toBe(1);
      expect(template.isSystem).toBe(false);

      template.update({ name: 'Updated Template', description: 'New description' });
      expect(template.name).toBe('Updated Template');
      expect(template.description).toBe('New description');

      const newVersion = template.publishNewVersion();
      expect(newVersion).toBe(2);
      expect(template.version).toBe(2);

      const json = template.toJSON();
      expect(json.name).toBe('Updated Template');
      expect(json.triggers.length).toBe(1);
      expect(json.conditions.length).toBe(1);
      expect(json.actions.length).toBe(1);
    });
  });

  describe('WorkflowExecution Aggregate', () => {
    it('should track execution lifecycle state transitions', () => {
      const execution = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.DRAFT,
        triggerSource: 'MANUAL',
        triggerReferenceId: 'ref-123',
        context: { amount: 150 },
        approvals: [],
      });

      expect(execution.id).toBe(executionId);
      expect(execution.executionStatus).toBe(WorkflowStatusEnum.DRAFT);

      execution.start();
      expect(execution.executionStatus).toBe(WorkflowStatusEnum.ACTIVE);

      execution.pause();
      expect(execution.executionStatus).toBe(WorkflowStatusEnum.PAUSED);

      execution.complete({ outcome: 'approved' });
      expect(execution.executionStatus).toBe(WorkflowStatusEnum.COMPLETED);
      expect(execution.result).toEqual({ outcome: 'approved' });

      const failedExecution = WorkflowExecution.create('failed-exec-id', {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.DRAFT,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });

      failedExecution.fail({ errorMsg: 'Failed step' });
      expect(failedExecution.executionStatus).toBe(WorkflowStatusEnum.FAILED);
      expect(failedExecution.error).toEqual({ errorMsg: 'Failed step' });
    });
  });

  describe('WorkflowApproval Entity', () => {
    it('should manage pending approvals and detect expiration', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const futureDate = new Date(Date.now() + 3600000); // 1 hour future

      const approvalExpired = new WorkflowApproval('approval-1', {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-123',
        approvalStatus: ApprovalStatusEnum.PENDING,
        expiresAt: pastDate,
      });

      const approvalActive = new WorkflowApproval('approval-2', {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-456',
        approvalStatus: ApprovalStatusEnum.PENDING,
        expiresAt: futureDate,
      });

      expect(approvalExpired.isExpired()).toBe(true);
      expect(approvalActive.isExpired()).toBe(false);

      approvalActive.approve('Approved comment');
      expect(approvalActive.approvalStatus).toBe(ApprovalStatusEnum.APPROVED);
      expect(approvalActive.comments).toBe('Approved comment');
      expect(approvalActive.approvedAt).toBeDefined();

      approvalExpired.reject('Rejected comment');
      expect(approvalExpired.approvalStatus).toBe(ApprovalStatusEnum.REJECTED);
      expect(approvalExpired.comments).toBe('Rejected comment');
    });
  });

  describe('WorkflowSchedule Entity', () => {
    it('should manage schedules and handle toggling', () => {
      const schedule = new WorkflowSchedule('schedule-1', {
        tenantId,
        workflowId,
        cronExpression: '*/5 * * * *',
        timezone: 'UTC',
        isActive: true,
      });

      expect(schedule.cronExpression).toBe('*/5 * * * *');
      expect(schedule.isActive).toBe(true);

      schedule.toggle(false);
      expect(schedule.isActive).toBe(false);

      const nextRun = new Date();
      schedule.updateRun(nextRun);
      expect(schedule.nextRunAt).toEqual(nextRun);
      expect(schedule.lastRunAt).toBeDefined();
    });
  });
});
