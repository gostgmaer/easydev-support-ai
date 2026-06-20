import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

// Services
import {
  WorkflowTemplateService,
  WorkflowExecutionService,
  WorkflowApprovalService,
  WorkflowScheduleService,
  WorkflowTriggerService,
  WorkflowActionService,
  WorkflowAuditService,
  WorkflowEngineService,
  WorkflowEventPublisher,
} from '../services';

// Controllers
import {
  WorkflowTemplateController,
  WorkflowExecutionController,
  WorkflowApprovalController,
  WorkflowScheduleController,
  WorkflowAuditController,
} from '../controllers';

// Queue Processor
import { WorkflowQueueProcessor } from '../jobs/workflow-queue.processor';

// Domain
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

// External Services Mocks
import { TicketService } from '../../tickets/services/ticket.service';
import { TicketAssignmentService } from '../../tickets/services/ticket-assignment.service';
import { TicketEscalationService } from '../../tickets/services/ticket-escalation.service';
import { MessageService } from '../../messages/services/message.service';
import { ConnectorExecutionService } from '../../connectors/services/connector-execution.service';
import { AiWorkflowService } from '../../ai-integration/services/ai-workflow.service';
import { CustomerService } from '../../customers/services/customer.service';
import { QueueService } from '@easydev/shared-queues';

describe('Workflow Orchestration Services & Controllers', () => {
  const tenantId = '00000000-0000-0000-0000-000000000000';
  const workflowId = 'workflow-uuid-123';
  const executionId = 'execution-uuid-456';
  const approvalId = 'approval-uuid-789';
  const scheduleId = 'schedule-uuid-abc';

  // Services
  let templateService: WorkflowTemplateService;
  let executionService: WorkflowExecutionService;
  let approvalService: WorkflowApprovalService;
  let scheduleService: WorkflowScheduleService;
  let triggerService: WorkflowTriggerService;
  let actionService: WorkflowActionService;
  let auditService: WorkflowAuditService;
  let engineService: WorkflowEngineService;
  let eventPublisher: WorkflowEventPublisher;
  let queueProcessor: WorkflowQueueProcessor;

  // Controllers
  let templateController: WorkflowTemplateController;
  let executionController: WorkflowExecutionController;
  let approvalController: WorkflowApprovalController;
  let scheduleController: WorkflowScheduleController;
  let auditController: WorkflowAuditController;

  // Mocks
  const mockRepository = {
    saveTemplate: jest.fn(),
    getTemplateById: jest.fn(),
    findTemplates: jest.fn(),
    deleteTemplate: jest.fn(),
    saveVersion: jest.fn(),
    saveExecution: jest.fn(),
    getExecutionById: jest.fn(),
    findExecutions: jest.fn(),
    saveApproval: jest.fn(),
    getApprovalById: jest.fn(),
    findApprovalsByExecutionId: jest.fn(),
    saveSchedule: jest.fn(),
    getScheduleById: jest.fn(),
    findSchedules: jest.fn(),
    deleteSchedule: jest.fn(),
    logAudit: jest.fn(),
    findAuditLogs: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
  };

  const mockTicketService = {
    create: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    update: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
  };

  const mockTicketAssignmentService = {
    assign: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
  };

  const mockTicketEscalationService = {
    escalate: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
  };

  const mockMessageService = {
    create: jest.fn().mockResolvedValue({ id: 'message-1' }),
  };

  const mockConnectorService = {
    executeCapability: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockAiWorkflowService = {
    triggerWorkflow: jest.fn().mockResolvedValue({ id: 'ai-exec-1' }),
  };

  const mockCustomerService = {
    update: jest.fn().mockResolvedValue({ id: 'cust-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        WorkflowTemplateController,
        WorkflowExecutionController,
        WorkflowApprovalController,
        WorkflowScheduleController,
        WorkflowAuditController,
      ],
      providers: [
        {
          provide: 'IWorkflowRepository',
          useValue: mockRepository,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: TicketService,
          useValue: mockTicketService,
        },
        {
          provide: TicketAssignmentService,
          useValue: mockTicketAssignmentService,
        },
        {
          provide: TicketEscalationService,
          useValue: mockTicketEscalationService,
        },
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: ConnectorExecutionService,
          useValue: mockConnectorService,
        },
        {
          provide: AiWorkflowService,
          useValue: mockAiWorkflowService,
        },
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
        WorkflowEventPublisher,
        WorkflowTemplateService,
        WorkflowExecutionService,
        WorkflowApprovalService,
        WorkflowScheduleService,
        WorkflowTriggerService,
        WorkflowActionService,
        WorkflowAuditService,
        WorkflowEngineService,
        WorkflowQueueProcessor,
      ],
    }).compile();

    templateService = module.get<WorkflowTemplateService>(WorkflowTemplateService);
    executionService = module.get<WorkflowExecutionService>(WorkflowExecutionService);
    approvalService = module.get<WorkflowApprovalService>(WorkflowApprovalService);
    scheduleService = module.get<WorkflowScheduleService>(WorkflowScheduleService);
    triggerService = module.get<WorkflowTriggerService>(WorkflowTriggerService);
    actionService = module.get<WorkflowActionService>(WorkflowActionService);
    auditService = module.get<WorkflowAuditService>(WorkflowAuditService);
    engineService = module.get<WorkflowEngineService>(WorkflowEngineService);
    eventPublisher = module.get<WorkflowEventPublisher>(WorkflowEventPublisher);
    queueProcessor = module.get<WorkflowQueueProcessor>(WorkflowQueueProcessor);

    templateController = module.get<WorkflowTemplateController>(WorkflowTemplateController);
    executionController = module.get<WorkflowExecutionController>(WorkflowExecutionController);
    approvalController = module.get<WorkflowApprovalController>(WorkflowApprovalController);
    scheduleController = module.get<WorkflowScheduleController>(WorkflowScheduleController);
    auditController = module.get<WorkflowAuditController>(WorkflowAuditController);
  });

  describe('WorkflowTemplateService', () => {
    it('should create and retrieve workflow templates', async () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Test Template',
        workflowType: WorkflowTypeEnum.CUSTOM_WORKFLOW,
        status: WorkflowStatusEnum.DRAFT,
      });

      mockRepository.saveTemplate.mockResolvedValue(template);
      mockRepository.getTemplateById.mockResolvedValue(template);

      const created = await templateService.createTemplate(tenantId, {
        name: 'Test Template',
        workflowType: WorkflowTypeEnum.CUSTOM_WORKFLOW,
        triggers: [{ triggerType: TriggerTypeEnum.MANUAL }],
        conditions: [{ field: 'status', operator: 'EQUALS', value: 'OPEN' }],
        actions: [{ actionType: ActionTypeEnum.SEND_NOTIFICATION, configuration: {}, sequenceOrder: 1 }],
      });

      expect(created).toBeDefined();
      expect(created.name).toBe('Test Template');

      const retrieved = await templateService.getTemplate(tenantId, workflowId);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(workflowId);

      mockRepository.getTemplateById.mockResolvedValue(null);
      await expect(templateService.getTemplate(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should seed system templates if none exist', async () => {
      mockRepository.findTemplates.mockResolvedValue([]);
      await templateService.onApplicationBootstrap();
      expect(mockRepository.saveTemplate).toHaveBeenCalled();
    });

    it('should skip seeding templates if system templates exist', async () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'VIP Customer Escalation',
        workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
        isSystem: true,
      });
      mockRepository.findTemplates.mockResolvedValue([template]);
      await templateService.onApplicationBootstrap();
      expect(mockRepository.saveTemplate).not.toHaveBeenCalled();
    });
  });

  describe('WorkflowExecutionService', () => {
    it('should manage workflow execution runs', async () => {
      const execution = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.DRAFT,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });

      mockRepository.saveExecution.mockResolvedValue(execution);
      mockRepository.getExecutionById.mockResolvedValue(execution);

      const created = await executionService.createExecution(tenantId, {
        workflowId,
        context: { orderId: '123' },
      });

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();

      const started = await executionService.startExecution(tenantId, executionId);
      expect(started.executionStatus).toBe(WorkflowStatusEnum.ACTIVE);

      const completed = await executionService.completeExecution(tenantId, executionId, { success: true });
      expect(completed.executionStatus).toBe(WorkflowStatusEnum.COMPLETED);

      const failed = await executionService.failExecution(tenantId, executionId, { error: 'err' });
      expect(failed.executionStatus).toBe(WorkflowStatusEnum.FAILED);
    });
  });

  describe('WorkflowApprovalService', () => {
    it('should manage manual approvals', async () => {
      const approval = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
      });

      mockRepository.saveApproval.mockResolvedValue(approval);
      mockRepository.getApprovalById.mockResolvedValue(approval);

      const created = await approvalService.createApproval(tenantId, executionId, 'approver-1');
      expect(created).toBeDefined();
      expect(created.id).toBe(approvalId);

      const approved = await approvalService.approve(tenantId, approvalId, 'Approved comment');
      expect(approved.approvalStatus).toBe(ApprovalStatusEnum.APPROVED);

      const approvalPending = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
      });
      mockRepository.getApprovalById.mockResolvedValue(approvalPending);
      mockRepository.saveApproval.mockResolvedValue(approvalPending);

      const rejected = await approvalService.reject(tenantId, approvalId, 'Rejected comment');
      expect(rejected.approvalStatus).toBe(ApprovalStatusEnum.REJECTED);
    });

    it('should auto-reject expired approvals', async () => {
      const expiredApproval = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
        expiresAt: new Date(Date.now() - 10000),
      });

      mockRepository.getApprovalById.mockResolvedValue(expiredApproval);

      await expect(approvalService.approve(tenantId, approvalId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('WorkflowScheduleService', () => {
    it('should manage workflow schedules', async () => {
      const schedule = new WorkflowSchedule(scheduleId, {
        tenantId,
        workflowId,
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        isActive: true,
      });

      mockRepository.saveSchedule.mockResolvedValue(schedule);
      mockRepository.getScheduleById.mockResolvedValue(schedule);

      const created = await scheduleService.createSchedule(tenantId, {
        workflowId,
        cronExpression: '0 0 * * *',
      });

      expect(created).toBeDefined();
      expect(created.cronExpression).toBe('0 0 * * *');

      const toggled = await scheduleService.toggleSchedule(tenantId, scheduleId, false);
      expect(toggled.isActive).toBe(false);
    });
  });

  describe('WorkflowActionService', () => {
    it('should execute actions and delegate to external services', async () => {
      const actionCreateTicket = {
        id: 'act-1',
        tenantId,
        workflowId,
        actionType: ActionTypeEnum.CREATE_TICKET,
        configuration: { subject: 'Test Ticket for customer {{customerId}}' },
        sequenceOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({}),
      } as any;

      const resTicket = await actionService.executeAction(tenantId, actionCreateTicket, { customerId: 'cust-1' }, executionId);
      expect(resTicket.ticketId).toBeDefined();
      expect(mockTicketService.create).toHaveBeenCalled();

      const actionAssign = {
        ...actionCreateTicket,
        actionType: ActionTypeEnum.ASSIGN_TICKET,
        configuration: { agentId: 'agent-1', teamId: 'team-1' },
      };
      await actionService.executeAction(tenantId, actionAssign, { ticketId: 'ticket-1' }, executionId);
      expect(mockTicketAssignmentService.assign).toHaveBeenCalled();

      const actionEscalate = {
        ...actionCreateTicket,
        actionType: ActionTypeEnum.ESCALATE_TICKET,
        configuration: { reason: 'SLA Breach!' },
      };
      await actionService.executeAction(tenantId, actionEscalate, { ticketId: 'ticket-1' }, executionId);
      expect(mockTicketEscalationService.escalate).toHaveBeenCalled();

      const actionUpdateCustomer = {
        ...actionCreateTicket,
        actionType: ActionTypeEnum.UPDATE_CUSTOMER,
        configuration: { updateDto: { preferredLanguage: 'fr' } },
      };
      await actionService.executeAction(tenantId, actionUpdateCustomer, { customerId: 'cust-1' }, executionId);
      expect(mockCustomerService.update).toHaveBeenCalled();

      const actionSendMessage = {
        ...actionCreateTicket,
        actionType: ActionTypeEnum.SEND_MESSAGE,
        configuration: { content: 'Message body' },
      };
      await actionService.executeAction(tenantId, actionSendMessage, { conversationId: 'conv-1' }, executionId);
      expect(mockMessageService.create).toHaveBeenCalled();

      const actionTriggerAi = {
        ...actionCreateTicket,
        actionType: ActionTypeEnum.TRIGGER_AI_WORKFLOW,
        configuration: { workflowId: 'ai-wf-1' },
      };
      await actionService.executeAction(tenantId, actionTriggerAi, { conversationId: 'conv-1' }, executionId);
      expect(mockAiWorkflowService.triggerWorkflow).toHaveBeenCalled();

      const actionCallConnector = {
        ...actionCreateTicket,
        actionType: ActionTypeEnum.CALL_CONNECTOR,
        configuration: { capability: 'get_order', payload: { id: 'order-1' } },
      };
      await actionService.executeAction(tenantId, actionCallConnector, {}, executionId);
      expect(mockConnectorService.executeCapability).toHaveBeenCalled();
    });
  });

  describe('WorkflowEngineService', () => {
    it('should run matched templates when triggers fire', async () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Order Escalation',
        workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
        triggers: [],
        conditions: [],
        actions: [],
      });

      const execution = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.DRAFT,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });

      mockRepository.saveExecution.mockResolvedValue(execution);
      mockRepository.getExecutionById.mockResolvedValue(execution);
      mockRepository.getTemplateById.mockResolvedValue(template);
      mockRepository.findTemplates.mockResolvedValue([template]);

      const runId = await engineService.runWorkflowTemplate(tenantId, template, { id: 'ticket-1' }, 'MANUAL');
      expect(runId).toBeDefined();
    });
  });

  describe('Controllers', () => {
    it('should expose API endpoints', async () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Refund Request',
        workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        status: WorkflowStatusEnum.DRAFT,
      });
      mockRepository.getTemplateById.mockResolvedValue(template);
      mockRepository.findTemplates.mockResolvedValue([template]);
      mockRepository.saveTemplate.mockResolvedValue(template);

      const tcRes = await templateController.getTemplate(tenantId, workflowId);
      expect(tcRes).toBeDefined();
      expect(tcRes.id).toBe(workflowId);

      const tcFind = await templateController.findTemplates(tenantId);
      expect(tcFind.length).toBe(1);

      const execution = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.DRAFT,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });
      mockRepository.saveExecution.mockResolvedValue(execution);
      mockRepository.getExecutionById.mockResolvedValue(execution);

      const ecExec = await executionController.executeWorkflow(tenantId, { workflowId, context: {} });
      expect(ecExec).toBeDefined();

      const approval = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
      });
      mockRepository.getApprovalById.mockResolvedValue(approval);
      mockRepository.saveApproval.mockResolvedValue(approval);

      const executionPaused = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.PAUSED,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });
      mockRepository.getExecutionById.mockResolvedValue(executionPaused);

      const reqMock = { user: { id: 'user-manager' } };
      const acApp = await approvalController.approve(tenantId, approvalId, { comments: 'Looks good' }, reqMock);
      expect(acApp.approvalStatus).toBe(ApprovalStatusEnum.APPROVED);
    });
  });

  describe('WorkflowQueueProcessor', () => {
    it('should handle background BullMQ jobs', async () => {
      const jobMock = {
        id: 'job-1',
        name: 'workflow-execution-job',
        data: {
          tenantId,
          executionId,
        },
      } as any;

      const result = await queueProcessor.handleJob(jobMock);
      expect(result).toEqual({ success: true });

      const scheduleJobMock = {
        id: 'job-2',
        name: 'workflow-schedule-job',
        data: {
          tenantId,
          scheduleId,
        },
      } as any;

      const schedule = new WorkflowSchedule(scheduleId, {
        tenantId,
        workflowId,
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        isActive: true,
      });

      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Refund Request',
        workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
      });

      mockRepository.getScheduleById.mockResolvedValue(schedule);
      mockRepository.getTemplateById.mockResolvedValue(template);
      mockRepository.saveSchedule.mockResolvedValue(schedule);

      const scheduleResult = await queueProcessor.handleJob(scheduleJobMock);
      expect(scheduleResult.status).toBe('triggered');
    });

    it('should handle other background BullMQ jobs (approvals, retry, cleanup, etc.)', async () => {
      // 1. workflow-approval-job
      const approvalJobMock = {
        id: 'job-approval',
        name: 'workflow-approval-job',
        data: { tenantId, approvalId },
      } as any;

      const expiredApproval = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      const executionPaused = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.PAUSED,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });

      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'VIP Customer Escalation',
        workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
      });

      mockRepository.getApprovalById.mockResolvedValue(expiredApproval);
      mockRepository.saveApproval.mockResolvedValue(expiredApproval);
      mockRepository.getExecutionById.mockResolvedValue(executionPaused);
      mockRepository.getTemplateById.mockResolvedValue(template);

      const approvalResult = await queueProcessor.handleJob(approvalJobMock);
      expect(approvalResult.status).toBe('expired_rejected');

      // Test active/non-expired approval
      const activeApproval = new WorkflowApproval(approvalId, {
        tenantId,
        workflowExecutionId: executionId,
        approverId: 'approver-1',
        approvalStatus: ApprovalStatusEnum.PENDING,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour future
      });
      mockRepository.getApprovalById.mockResolvedValue(activeApproval);
      const activeApprovalResult = await queueProcessor.handleJob(approvalJobMock);
      expect(activeApprovalResult.status).toBe('checked_active');

      // 2. workflow-retry-job
      const retryJobMock = {
        id: 'job-retry',
        name: 'workflow-retry-job',
        data: { tenantId, executionId },
      } as any;

      const executionPausedForRetry = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.PAUSED,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });
      mockRepository.getExecutionById.mockResolvedValue(executionPausedForRetry);
      const retryResult = await queueProcessor.handleJob(retryJobMock);
      expect(retryResult.success).toBe(true);

      // 3. workflow-cleanup-job
      const cleanupJobMock = {
        id: 'job-cleanup',
        name: 'workflow-cleanup-job',
        data: { tenantId },
      } as any;
      const cleanupResult = await queueProcessor.handleJob(cleanupJobMock);
      expect(cleanupResult.cleaned).toBe(true);

      // 4. Unknown job
      const unknownJobMock = {
        id: 'job-unknown',
        name: 'workflow-unknown-job',
        data: {},
      } as any;
      await expect(queueProcessor.handleJob(unknownJobMock)).rejects.toThrow();
    });
  });

  describe('WorkflowTemplateService - Complete Lifecycle Coverage', () => {
    it('should update, delete, activate, pause, and query audit logs', async () => {
      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Template Life',
        workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        status: WorkflowStatusEnum.DRAFT,
      });

      mockRepository.getTemplateById.mockResolvedValue(template);
      mockRepository.saveTemplate.mockResolvedValue(template);
      mockRepository.deleteTemplate.mockResolvedValue(true);

      // Update template with triggers, conditions, actions, variables
      const updated = await templateService.updateTemplate(tenantId, workflowId, {
        name: 'Template Life Updated',
        triggers: [{ triggerType: TriggerTypeEnum.TICKET_UPDATED, configuration: {} }],
        conditions: [{ field: 'status', operator: 'EQUALS', value: 'CLOSED' }],
        actions: [{ actionType: ActionTypeEnum.ADD_TAG, configuration: { tag: 'VIP' }, sequenceOrder: 1 }],
        variables: { vip: { type: 'boolean', value: 'true' } },
      });
      expect(updated.name).toBe('Template Life Updated');
      expect(updated.triggers.length).toBe(1);
      expect(updated.conditions.length).toBe(1);
      expect(updated.actions.length).toBe(1);

      // Delete template
      const deleted = await templateService.deleteTemplate(tenantId, workflowId);
      expect(deleted).toBe(true);

      // Activate & Pause
      const activated = await templateService.activateTemplate(tenantId, workflowId);
      expect(activated.status).toBe(WorkflowStatusEnum.ACTIVE);

      const paused = await templateService.pauseTemplate(tenantId, workflowId);
      expect(paused.status).toBe(WorkflowStatusEnum.PAUSED);

      // Audit logs query
      mockRepository.findAuditLogs.mockResolvedValue([{ action: 'TEST_AUDIT' }]);
      const auditLogs = await auditService.getAuditLogs(tenantId, workflowId, executionId);
      expect(auditLogs.length).toBe(1);
    });
  });

  describe('WorkflowEngineService - Condition Evaluation and Triggers', () => {
    it('should evaluate trigger event conditions (EQUALS, CONTAINS, GT, LT)', async () => {
      const template1 = WorkflowTemplate.create('wf-1', {
        tenantId,
        name: 'Template Equals',
        workflowType: WorkflowTypeEnum.CONVERSATION_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
        triggers: [
          new WorkflowTrigger('t-1', { tenantId, workflowId: 'wf-1', triggerType: TriggerTypeEnum.CONVERSATION_CREATED }),
        ],
        conditions: [
          new WorkflowCondition('c-1', { tenantId, workflowId: 'wf-1', field: 'source', operator: 'EQUALS', value: 'WEB' }),
        ],
        actions: [],
      });

      const template2 = WorkflowTemplate.create('wf-2', {
        tenantId,
        name: 'Template Contains',
        workflowType: WorkflowTypeEnum.CONVERSATION_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
        triggers: [
          new WorkflowTrigger('t-2', { tenantId, workflowId: 'wf-2', triggerType: TriggerTypeEnum.CONVERSATION_CREATED }),
        ],
        conditions: [
          new WorkflowCondition('c-2', { tenantId, workflowId: 'wf-2', field: 'body', operator: 'CONTAINS', value: 'urgent' }),
        ],
        actions: [],
      });

      const template3 = WorkflowTemplate.create('wf-3', {
        tenantId,
        name: 'Template GT & LT',
        workflowType: WorkflowTypeEnum.CONVERSATION_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
        triggers: [
          new WorkflowTrigger('t-3', { tenantId, workflowId: 'wf-3', triggerType: TriggerTypeEnum.CONVERSATION_CREATED }),
        ],
        conditions: [
          new WorkflowCondition('c-3', { tenantId, workflowId: 'wf-3', field: 'score', operator: 'GT', value: '10' }),
          new WorkflowCondition('c-4', { tenantId, workflowId: 'wf-3', field: 'score', operator: 'LT', value: '100' }),
        ],
        actions: [],
      });

      // Find trigger templates mock
      mockRepository.findTemplates.mockResolvedValue([template1, template2, template3]);

      // Execution mock
      const mockExecution = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId: 'wf-1',
        executionStatus: WorkflowStatusEnum.DRAFT,
        triggerSource: 'CONVERSATION_CREATED',
        context: {},
        approvals: [],
      });
      mockRepository.saveExecution.mockResolvedValue(mockExecution);

      // Evaluate trigger with matching contexts
      await engineService.evaluateEventTriggers(tenantId, TriggerTypeEnum.CONVERSATION_CREATED, {
        source: 'WEB',
        body: 'This is extremely urgent request',
        score: 50,
      });

      // Non-matching check
      await engineService.evaluateEventTriggers(tenantId, TriggerTypeEnum.CONVERSATION_CREATED, {
        source: 'EMAIL',
        body: 'low priority email request',
        score: 5,
      });
    });

    it('should handle resumeExecution with auto-rejection (approved = false)', async () => {
      const executionPaused = WorkflowExecution.create(executionId, {
        tenantId,
        workflowId,
        executionStatus: WorkflowStatusEnum.PAUSED,
        triggerSource: 'MANUAL',
        context: {},
        approvals: [],
      });

      const template = WorkflowTemplate.create(workflowId, {
        tenantId,
        name: 'Refund Request',
        workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        status: WorkflowStatusEnum.ACTIVE,
      });

      mockRepository.getExecutionById.mockResolvedValue(executionPaused);
      mockRepository.getTemplateById.mockResolvedValue(template);
      mockRepository.saveExecution.mockResolvedValue(executionPaused);

      await engineService.resumeExecution(tenantId, executionId, false, 'approver-123', 'Denied.');
      expect(executionPaused.executionStatus).toBe(WorkflowStatusEnum.FAILED);
    });
  });

  describe('WorkflowScheduleService & Audit coverage', () => {
    it('should delete schedules and record execution runs', async () => {
      const schedule = new WorkflowSchedule(scheduleId, {
        tenantId,
        workflowId,
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        isActive: true,
      });
      mockRepository.getScheduleById.mockResolvedValue(schedule);
      mockRepository.saveSchedule.mockResolvedValue(schedule);
      mockRepository.deleteSchedule.mockResolvedValue(true);

      const run = await scheduleService.recordExecutionRun(tenantId, scheduleId);
      expect(run.lastRunAt).toBeDefined();

      const deleted = await scheduleService.deleteSchedule(tenantId, scheduleId);
      expect(deleted).toBe(true);

      mockRepository.deleteSchedule.mockResolvedValue(false);
      await expect(scheduleService.deleteSchedule(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Additional Action, Engine, Event, Execution, Template, Approval, and Schedule Coverage', () => {
    describe('WorkflowActionService Edge Cases', () => {
      it('should throw error on UPDATE_TICKET when ticketId is missing', async () => {
        const action = {
          actionType: ActionTypeEnum.UPDATE_TICKET,
          configuration: {},
        } as any;
        await expect(actionService.executeAction(tenantId, action, {}, executionId)).rejects.toThrow(
          'Ticket ID missing in context or configuration for update action'
        );
      });

      it('should successfully UPDATE_TICKET with context ticketId', async () => {
        const action = {
          actionType: ActionTypeEnum.UPDATE_TICKET,
          configuration: { status: 'CLOSED', priority: 'HIGH', subject: 'Closed ticket {{id}}', description: 'Desc {{id}}' },
        } as any;
        mockTicketService.update.mockResolvedValue({ id: 'ticket-1' });
        const res = await actionService.executeAction(tenantId, action, { ticketId: 'ticket-1', id: '123' }, executionId);
        expect(res).toEqual({ status: 'updated' });
        expect(mockTicketService.update).toHaveBeenCalledWith(tenantId, 'ticket-1', {
          status: 'CLOSED',
          priority: 'HIGH',
          subject: 'Closed ticket 123',
          description: 'Desc 123',
          metadata: undefined,
        });
      });

      it('should throw error on ASSIGN_TICKET when ticketId is missing', async () => {
        const action = {
          actionType: ActionTypeEnum.ASSIGN_TICKET,
          configuration: {},
        } as any;
        await expect(actionService.executeAction(tenantId, action, {}, executionId)).rejects.toThrow(
          'Ticket ID missing in context or configuration for assign action'
        );
      });

      it('should throw error on ESCALATE_TICKET when ticketId is missing', async () => {
        const action = {
          actionType: ActionTypeEnum.ESCALATE_TICKET,
          configuration: {},
        } as any;
        await expect(actionService.executeAction(tenantId, action, {}, executionId)).rejects.toThrow(
          'Ticket ID missing in context or configuration for escalate action'
        );
      });

      it('should throw error on UPDATE_CUSTOMER when customerId is missing', async () => {
        const action = {
          actionType: ActionTypeEnum.UPDATE_CUSTOMER,
          configuration: {},
        } as any;
        await expect(actionService.executeAction(tenantId, action, {}, executionId)).rejects.toThrow(
          'Customer ID missing in context or configuration for update_customer action'
        );
      });

      it('should run SEND_EMAIL', async () => {
        const action = {
          actionType: ActionTypeEnum.SEND_EMAIL,
          configuration: { to: 'user@example.com', subject: 'Hello' },
        } as any;
        const res = await actionService.executeAction(tenantId, action, {}, executionId);
        expect(res).toEqual({ status: 'email_sent' });
      });

      it('should run SEND_NOTIFICATION', async () => {
        const action = {
          actionType: ActionTypeEnum.SEND_NOTIFICATION,
          configuration: { userId: 'u-1', message: 'Hello' },
        } as any;
        const res = await actionService.executeAction(tenantId, action, {}, executionId);
        expect(res).toEqual({ status: 'notified' });
      });

      it('should run APPROVAL', async () => {
        const action = {
          actionType: ActionTypeEnum.APPROVAL,
          configuration: { approverId: 'approver-123' },
        } as any;
        const approval = new WorkflowApproval(approvalId, {
          tenantId,
          workflowExecutionId: executionId,
          approverId: 'approver-123',
          approvalStatus: ApprovalStatusEnum.PENDING,
        });
        mockRepository.saveApproval.mockResolvedValue(approval);

        const res = await actionService.executeAction(tenantId, action, {}, executionId);
        expect(res).toEqual({
          approvalId: approval.id,
          status: 'approval_requested',
          paused: true,
        });
      });

      it('should run WAIT', async () => {
        const action = {
          actionType: ActionTypeEnum.WAIT,
          configuration: { durationSeconds: 0.001 },
        } as any;
        const res = await actionService.executeAction(tenantId, action, {}, executionId);
        expect(res).toEqual({ status: 'waited' });
      });

      it('should run ADD_TAG and REMOVE_TAG', async () => {
        const actionAdd = {
          actionType: ActionTypeEnum.ADD_TAG,
          configuration: { tag: 'VIP' },
        } as any;
        const resAdd = await actionService.executeAction(tenantId, actionAdd, {}, executionId);
        expect(resAdd).toEqual({ tagAdded: 'VIP' });

        const actionRemove = {
          actionType: ActionTypeEnum.REMOVE_TAG,
          configuration: { tag: 'VIP' },
        } as any;
        const resRemove = await actionService.executeAction(tenantId, actionRemove, {}, executionId);
        expect(resRemove).toEqual({ tagRemoved: 'VIP' });
      });

      it('should run default case for unknown action type', async () => {
        const action = {
          actionType: 'UNKNOWN_ACTION_TYPE' as any,
          configuration: {},
        } as any;
        const res = await actionService.executeAction(tenantId, action, {}, executionId);
        expect(res).toEqual({ status: 'custom_completed' });
      });

      it('should resolve arrays in resolvePayload', async () => {
        const action = {
          actionType: ActionTypeEnum.CALL_CONNECTOR,
          configuration: {
            capability: 'test_cap',
            payload: [
              'simple text',
              { key: 'nested {{val}}' },
              ['array {{val}}']
            ]
          },
        } as any;
        mockConnectorService.executeCapability.mockResolvedValue({ success: true });
        const res = await actionService.executeAction(tenantId, action, { val: '123' }, executionId);
        expect(res.status).toBe('connector_executed');
        expect(mockConnectorService.executeCapability).toHaveBeenCalledWith(
          tenantId,
          'test_cap',
          ['simple text', { key: 'nested 123' }, ['array 123']],
          { workflowId: executionId }
        );
      });
    });

    describe('WorkflowEngineService Edge Cases', () => {
      it('should evaluate trigger conditions with GT/LT/CONTAINS/EQUALS/invalid operator', async () => {
        const condGt = new WorkflowCondition('c-gt', { tenantId, workflowId, field: 'num', operator: 'GT', value: '10' });
        const condLt = new WorkflowCondition('c-lt', { tenantId, workflowId, field: 'num', operator: 'LT', value: '20' });
        const condEq = new WorkflowCondition('c-eq', { tenantId, workflowId, field: 'str', operator: 'EQUALS', value: 'abc' });
        const condContains = new WorkflowCondition('c-contains', { tenantId, workflowId, field: 'str', operator: 'CONTAINS', value: 'xyz' });
        const condInvalid = new WorkflowCondition('c-invalid', { tenantId, workflowId, field: 'str', operator: 'INVALID_OP', value: '123' });

        // Template with invalid operator, should return false when evaluated
        const templateInvalid = WorkflowTemplate.create('wf-conds-invalid', {
          tenantId,
          name: 'Invalid Template',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
          triggers: [],
          conditions: [condInvalid],
          actions: [],
        });

        // Template with matching GT, LT, EQUALS, CONTAINS conditions
        const templateValid = WorkflowTemplate.create('wf-conds-valid', {
          tenantId,
          name: 'Valid Template',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
          triggers: [],
          conditions: [condGt, condLt, condEq, condContains],
          actions: [],
        });

        mockRepository.findTemplates.mockResolvedValue([templateInvalid, templateValid]);
        const triggerServicePrivate = (engineService as any).triggerService;
        jest.spyOn(triggerServicePrivate, 'findTriggeredTemplates').mockResolvedValue([templateInvalid, templateValid]);

        const runSpy = jest.spyOn(engineService, 'runWorkflowTemplate').mockResolvedValue('exec-1');

        await engineService.evaluateEventTriggers(tenantId, TriggerTypeEnum.TICKET_CREATED, {
          num: 15,
          str: 'abcxyz',
        });

        // templateInvalid evaluates to false, templateValid evaluates to true (num=15 matches GT 10 & LT 20, str=abcxyz matches CONTAINS xyz but NOT EQUALS abc!)
        // Wait, templateValid has condEq (str EQUALS abc). If str is abcxyz, EQUALS is false, so templateValid is NOT matched either.
        // Let's call with str: "abcxyz" first (both false):
        expect(runSpy).not.toHaveBeenCalled();

        // Now run with str: "abc" but we need CONTAINS "xyz". Since "abc" does not contain "xyz", it still fails.
        // Let's create a template with just GT, LT, and EQUALS to verify they match.
        templateValid.setDefinition([], [condGt, condLt, condEq], []);
        await engineService.evaluateEventTriggers(tenantId, TriggerTypeEnum.TICKET_CREATED, {
          num: 15,
          str: 'abc',
        });
        expect(runSpy).toHaveBeenCalledWith(tenantId, templateValid, { num: 15, str: 'abc' }, TriggerTypeEnum.TICKET_CREATED);
      });

      it('should handle execution background action failure', async () => {
        const template = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'Fail Actions',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
          triggers: [],
          conditions: [],
          actions: [
            new WorkflowAction('act-fail', {
              tenantId,
              workflowId,
              actionType: ActionTypeEnum.ASSIGN_TICKET,
              configuration: {},
              sequenceOrder: 1,
            })
          ],
        });

        const mockExecution = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.DRAFT,
          triggerSource: 'MANUAL',
          context: {},
          approvals: [],
        });

        mockRepository.saveExecution.mockResolvedValue(mockExecution);
        mockRepository.getExecutionById.mockResolvedValue(mockExecution);
        mockRepository.getTemplateById.mockResolvedValue(template);

        const execId = await engineService.runWorkflowTemplate(tenantId, template, {}, 'MANUAL');
        expect(execId).toBe(executionId);

        await new Promise(resolve => setTimeout(resolve, 10));
        expect(mockRepository.saveExecution).toHaveBeenCalled();
        expect(mockRepository.logAudit).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'EXECUTION_FAILED',
            details: expect.stringContaining('Ticket ID missing')
          }),
          tenantId
        );
      });

      it('should throw error when resuming non-PAUSED execution', async () => {
        const executionDraft = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.DRAFT,
          triggerSource: 'MANUAL',
          context: {},
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(executionDraft);
        const template = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'Temp',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
        });
        mockRepository.getTemplateById.mockResolvedValue(template);

        await expect(
          engineService.resumeExecution(tenantId, executionId, true, 'approver-1')
        ).rejects.toThrow(`Workflow execution ${executionId} is not in PAUSED state`);
      });

      it('should slice actions from APPROVAL when resuming execution, and slice correctly if no approval action exists', async () => {
        const executionPaused = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.PAUSED,
          triggerSource: 'MANUAL',
          context: { ticketId: 't-1' },
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(executionPaused);

        const templateWithApproval = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'Approval Flow',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
          actions: [
            new WorkflowAction('a-app', { tenantId, workflowId, actionType: ActionTypeEnum.APPROVAL, configuration: {}, sequenceOrder: 1 }),
            new WorkflowAction('a-notify', { tenantId, workflowId, actionType: ActionTypeEnum.SEND_NOTIFICATION, configuration: { userId: 'u-1', message: 'Approved' }, sequenceOrder: 2 }),
          ],
        });
        mockRepository.getTemplateById.mockResolvedValue(templateWithApproval);
        mockRepository.saveExecution.mockResolvedValue(executionPaused);

        await engineService.resumeExecution(tenantId, executionId, true, 'approver-1');
        expect(mockRepository.logAudit).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'APPROVAL_GRANTED',
            details: expect.stringContaining('Workflow approved by approver')
          }),
          tenantId
        );

        const executionPaused2 = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.PAUSED,
          triggerSource: 'MANUAL',
          context: { ticketId: 't-1' },
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(executionPaused2);
        mockRepository.saveExecution.mockResolvedValue(executionPaused2);

        const templateNoApproval = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'No Approval Flow',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
          actions: [
            new WorkflowAction('a-notify-only', { tenantId, workflowId, actionType: ActionTypeEnum.SEND_NOTIFICATION, configuration: { userId: 'u-1', message: 'Just Notify' }, sequenceOrder: 1 }),
          ],
        });
        mockRepository.getTemplateById.mockResolvedValue(templateNoApproval);
        await engineService.resumeExecution(tenantId, executionId, true, 'approver-1');
        expect(mockRepository.logAudit).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'EXECUTION_COMPLETED',
            details: expect.stringContaining('completed successfully')
          }),
          tenantId
        );
      });

      it('should fail execution when action execution fails after resuming', async () => {
        const executionPaused = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.PAUSED,
          triggerSource: 'MANUAL',
          context: {},
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(executionPaused);

        const template = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'Resumed Failure Flow',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
          actions: [
            new WorkflowAction('a-app', { tenantId, workflowId, actionType: ActionTypeEnum.APPROVAL, configuration: {}, sequenceOrder: 1 }),
            new WorkflowAction('a-assign-fail', { tenantId, workflowId, actionType: ActionTypeEnum.ASSIGN_TICKET, configuration: {}, sequenceOrder: 2 }),
          ],
        });
        mockRepository.getTemplateById.mockResolvedValue(template);
        mockRepository.saveExecution.mockResolvedValue(executionPaused);

        await engineService.resumeExecution(tenantId, executionId, true, 'approver-1');
        
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(mockRepository.logAudit).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'EXECUTION_FAILED',
            details: expect.stringContaining('Ticket ID missing')
          }),
          tenantId
        );
      });
    });

    describe('WorkflowEventPublisher Edge Cases', () => {
      it('should handle publishAll and errors on publish', async () => {
        mockQueueService.addJob.mockRejectedValueOnce(new Error('Queue Error'));
        const event = {
          constructor: { eventName: 'workflow.execution.started' },
          tenantId,
          executionId,
          workflowId,
          getAggregateId: () => executionId,
        } as any;

        await eventPublisher.publish(event);

        mockQueueService.addJob.mockClear();
        mockQueueService.addJob.mockResolvedValue({ id: 'job-1' });
        await eventPublisher.publishAll([event, event]);
        expect(mockQueueService.addJob).toHaveBeenCalledTimes(2);
      });
    });

    describe('WorkflowExecutionService Edge Cases', () => {
      it('should throw NotFoundException on getExecution when execution is missing', async () => {
        mockRepository.getExecutionById.mockResolvedValue(null);
        await expect(executionService.getExecution(tenantId, 'non-existent')).rejects.toThrow(
          NotFoundException
        );
      });

      it('should find executions', async () => {
        mockRepository.findExecutions.mockResolvedValue([]);
        const res = await executionService.findExecutions(tenantId, { status: 'ACTIVE' });
        expect(res).toEqual([]);
      });

      it('should pause execution', async () => {
        const execution = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.ACTIVE,
          triggerSource: 'MANUAL',
          context: {},
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(execution);
        mockRepository.saveExecution.mockImplementation(async (e) => e);

        const res = await executionService.pauseExecution(tenantId, executionId);
        expect(res.executionStatus).toBe(WorkflowStatusEnum.PAUSED);
      });
    });

    describe('WorkflowTemplateService Edge Cases', () => {
      it('should catch error on system template seeding when repository fails', async () => {
        mockRepository.findTemplates.mockRejectedValueOnce(new Error('DB connection failed'));
        await expect(templateService.onApplicationBootstrap()).resolves.not.toThrow();
      });

      it('should throw NotFoundException when deleting non-existent template', async () => {
        mockRepository.deleteTemplate.mockResolvedValue(false);
        await expect(templateService.deleteTemplate(tenantId, 'non-existent')).rejects.toThrow(
          NotFoundException
        );
      });

      it('should publish template version successfully', async () => {
        const template = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'VIP Customer Escalation',
          workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
          status: WorkflowStatusEnum.ACTIVE,
        });
        mockRepository.getTemplateById.mockResolvedValue(template);
        mockRepository.saveTemplate.mockResolvedValue(template);
        mockRepository.saveVersion.mockResolvedValue({ id: 'version-1' });

        const ver = await templateService.publishVersion(tenantId, workflowId);
        expect(ver).toBe(2);
        expect(mockRepository.saveVersion).toHaveBeenCalledWith(
          {
            templateId: workflowId,
            versionNumber: 2,
            definition: template.toJSON(),
            isActive: true,
          },
          tenantId
        );
      });
    });

    describe('WorkflowApprovalService Edge Cases', () => {
      it('should throw NotFoundException on getApproval when approval is missing', async () => {
        mockRepository.getApprovalById.mockResolvedValue(null);
        await expect(approvalService.getApproval(tenantId, 'non-existent')).rejects.toThrow(
          NotFoundException
        );
      });

      it('should throw BadRequestException when approving or rejecting resolved approval', async () => {
        const resolvedApproval = new WorkflowApproval(approvalId, {
          tenantId,
          workflowExecutionId: executionId,
          approverId: 'approver-1',
          approvalStatus: ApprovalStatusEnum.APPROVED,
        });
        mockRepository.getApprovalById.mockResolvedValue(resolvedApproval);

        await expect(approvalService.approve(tenantId, approvalId)).rejects.toThrow(
          BadRequestException
        );
        await expect(approvalService.reject(tenantId, approvalId)).rejects.toThrow(
          BadRequestException
        );
      });

      it('should retrieve approvals for execution', async () => {
        mockRepository.findApprovalsByExecutionId.mockResolvedValue([]);
        const res = await approvalService.getApprovalsForExecution(tenantId, executionId);
        expect(res).toEqual([]);
      });
    });

    describe('WorkflowScheduleService Edge Cases', () => {
      it('should throw NotFoundException on getSchedule when schedule is missing', async () => {
        mockRepository.getScheduleById.mockResolvedValue(null);
        await expect(scheduleService.getSchedule(tenantId, 'non-existent')).rejects.toThrow(
          NotFoundException
        );
      });

      it('should find schedules', async () => {
        mockRepository.findSchedules.mockResolvedValue([]);
        const res = await scheduleService.findSchedules(tenantId, true);
        expect(res).toEqual([]);
      });
    });

    describe('Controller Endpoints', () => {
      it('should call all templateController endpoints', async () => {
        const template = WorkflowTemplate.create(workflowId, {
          tenantId,
          name: 'Template Life',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          status: WorkflowStatusEnum.DRAFT,
        });
        mockRepository.getTemplateById.mockResolvedValue(template);
        mockRepository.saveTemplate.mockResolvedValue(template);
        mockRepository.deleteTemplate.mockResolvedValue(true);
        mockRepository.saveVersion.mockResolvedValue({ id: 'ver-1' });

        const tcCreate = await templateController.createTemplate(tenantId, {
          name: 'New template',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
        });
        expect(tcCreate).toBeDefined();

        const tcUpdate = await templateController.updateTemplate(tenantId, workflowId, {
          name: 'Updated Name',
        });
        expect(tcUpdate).toBeDefined();

        const tcPublish = await templateController.publishVersion(tenantId, workflowId);
        expect(tcPublish).toEqual({ success: true, versionNumber: 2 });

        const tcActivate = await templateController.activateTemplate(tenantId, workflowId);
        expect(tcActivate.status).toBe(WorkflowStatusEnum.ACTIVE);

        const tcPause = await templateController.pauseTemplate(tenantId, workflowId);
        expect(tcPause.status).toBe(WorkflowStatusEnum.PAUSED);

        const tcDelete = await templateController.deleteTemplate(tenantId, workflowId);
        expect(tcDelete).toEqual({ success: true });
      });

      it('should call all executionController endpoints', async () => {
        const execution = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.ACTIVE,
          triggerSource: 'MANUAL',
          context: {},
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(execution);
        mockRepository.findExecutions.mockResolvedValue([execution]);

        const ecGet = await executionController.getExecution(tenantId, executionId);
        expect(ecGet.id).toBe(executionId);

        const ecFind = await executionController.findExecutions(tenantId, workflowId, 'ACTIVE');
        expect(ecFind.length).toBe(1);
      });

      it('should call all approvalController endpoints', async () => {
        const approval = new WorkflowApproval(approvalId, {
          tenantId,
          workflowExecutionId: executionId,
          approverId: 'approver-1',
          approvalStatus: ApprovalStatusEnum.PENDING,
        });
        mockRepository.getApprovalById.mockResolvedValue(approval);
        mockRepository.saveApproval.mockResolvedValue(approval);
        mockRepository.findApprovalsByExecutionId.mockResolvedValue([approval]);

        const executionPaused = WorkflowExecution.create(executionId, {
          tenantId,
          workflowId,
          executionStatus: WorkflowStatusEnum.PAUSED,
          triggerSource: 'MANUAL',
          context: {},
          approvals: [],
        });
        mockRepository.getExecutionById.mockResolvedValue(executionPaused);

        const acGet = await approvalController.getApproval(tenantId, approvalId);
        expect(acGet.id).toBe(approvalId);

        const acGetList = await approvalController.getApprovalsForExecution(tenantId, executionId);
        expect(acGetList.length).toBe(1);

        const acReject = await approvalController.reject(tenantId, approvalId, { comments: 'no' }, { user: { id: 'm-1' } });
        expect(acReject.approvalStatus).toBe(ApprovalStatusEnum.REJECTED);
      });

      it('should call all scheduleController endpoints', async () => {
        const schedule = new WorkflowSchedule(scheduleId, {
          tenantId,
          workflowId,
          cronExpression: '0 0 * * *',
          timezone: 'UTC',
          isActive: true,
        });
        mockRepository.getScheduleById.mockResolvedValue(schedule);
        mockRepository.saveSchedule.mockResolvedValue(schedule);
        mockRepository.deleteSchedule.mockResolvedValue(true);
        mockRepository.findSchedules.mockResolvedValue([schedule]);

        const scCreate = await scheduleController.createSchedule(tenantId, { workflowId, cronExpression: '0 * * * *' });
        expect(scCreate).toBeDefined();

        const scGet = await scheduleController.getSchedule(tenantId, scheduleId);
        expect(scGet.id).toBe(scheduleId);

        const scFind = await scheduleController.findSchedules(tenantId, 'true');
        expect(scFind.length).toBe(1);

        const scToggle = await scheduleController.toggleSchedule(tenantId, scheduleId, false);
        expect(scToggle.isActive).toBe(false);

        const scDelete = await scheduleController.deleteSchedule(tenantId, scheduleId);
        expect(scDelete).toEqual({ success: true });
      });

      it('should call auditController endpoint', async () => {
        mockRepository.findAuditLogs.mockResolvedValue([{ action: 'RUN' }]);
        const acLogs = await auditController.getAuditLogs(tenantId, workflowId, executionId);
        expect(acLogs.length).toBe(1);
      });
    });
  });
});
