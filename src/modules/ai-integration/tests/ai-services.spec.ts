import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

// Services
import {
  AiAgentService,
  AiConversationService,
  AiWorkflowService,
  AiToolExecutionService,
  AiEscalationService,
  AiUsageService,
  AiRoutingService,
  AiResponseService,
  AiEventPublisher,
  AIPlatformClient,
} from '../services';

// Controllers
import {
  AiAgentController,
  AiWorkflowController,
  AiSessionController,
  AiUsageController,
  AiEscalationController,
} from '../controllers';

// Jobs
import { AiQueueProcessor } from '../jobs/ai-queue.processor';

// Domain and value objects
import { AiAgent } from '../domain/ai-agent.aggregate';
import {
  AiConversationSession,
  AiWorkflowExecution,
  AiToolRequest,
  AiToolResult,
  AiEscalation,
  AiUsageMetric,
} from '../domain/entities';
import {
  AgentTypeEnum,
  AgentStatusEnum,
  SessionStateEnum,
  WorkflowStatusEnum,
  ToolStatusEnum,
  EscalationStatusEnum,
  EscalationTargetEnum,
} from '../domain/value-objects';

// External services to mock
import { ConversationService } from '../../conversations/services/conversation.service';
import { MessageService } from '../../messages/services/message.service';
import { CustomerService } from '../../customers/services/customer.service';
import { ConnectorExecutionService } from '../../connectors/services/connector-execution.service';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { KnowledgeSearchService } from '../../knowledge-base/services/knowledge-search.service';
import { KnowledgeChunkService } from '../../knowledge-base/services/knowledge-chunk.service';
import { InboxService } from '../../inbox/services/inbox.service';
import { MessageDraftService } from '../../messages/services/message-draft.service';

// Guards & Decorators
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { TenantResolver } from '@easydev/shared-kernel';
import { QueueService } from '@easydev/shared-queues';

describe('AI Integration Module Services and Controllers', () => {
  const tenantId = 'tenant-test-id';
  const agentId = 'agent-test-id';
  const conversationId = 'conv-test-id';
  const customerId = 'cust-test-id';

  // Services
  let agentService: AiAgentService;
  let conversationServiceAi: AiConversationService;
  let workflowService: AiWorkflowService;
  let toolService: AiToolExecutionService;
  let escalationService: AiEscalationService;
  let usageService: AiUsageService;
  let routingService: AiRoutingService;
  let responseService: AiResponseService;
  let processor: AiQueueProcessor;

  // Controllers
  let agentController: AiAgentController;
  let workflowController: AiWorkflowController;
  let sessionController: AiSessionController;
  let usageController: AiUsageController;
  let escalationController: AiEscalationController;

  // Mocks
  const mockRepo = {
    saveAgent: jest.fn(),
    getAgentById: jest.fn(),
    findAgents: jest.fn(),
    deleteAgent: jest.fn(),
    saveSession: jest.fn(),
    getSessionByConversationId: jest.fn(),
    saveWorkflowExecution: jest.fn(),
    getWorkflowExecutionById: jest.fn(),
    saveToolRequest: jest.fn(),
    getToolRequestById: jest.fn(),
    saveToolResult: jest.fn(),
    getToolResultByRequestId: jest.fn(),
    saveEscalation: jest.fn(),
    getEscalationById: jest.fn(),
    findEscalations: jest.fn(),
    saveUsageMetric: jest.fn(),
    getUsageMetric: jest.fn(),
    findUsageMetrics: jest.fn(),
    logResponse: jest.fn(),
  };

  const mockAiClient = {
    runWorkflow: jest.fn(),
    generate: jest.fn(),
    classify: jest.fn(),
    embed: jest.fn(),
    rerank: jest.fn(),
    recallMemory: jest.fn(),
    getConversationContext: jest.fn(),
    submitToolResult: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  const mockConversationService = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockMessageService = {
    create: jest.fn(),
  };

  const mockCustomerService = {
    findById: jest.fn(),
  };

  const mockConnectorExecutionService = {
    executeCapability: jest.fn(),
  };

  const mockRealtimeService = {
    emitAiEscalation: jest.fn(),
    emitAiSessionUpdate: jest.fn(),
  };

  const mockWorkflowEngineService = {
    evaluateEventTriggers: jest.fn(),
  };

  const mockKnowledgeSearchService = {
    search: jest.fn(),
  };

  const mockKnowledgeChunkService = {
    getChunks: jest.fn(),
  };

  const mockInboxService = {
    isAiActive: jest.fn().mockResolvedValue(true),
  };

  const mockMessageDraftService = {
    save: jest.fn().mockResolvedValue({ id: 'draft-test-id' }),
    send: jest.fn(),
    discard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        AiAgentController,
        AiWorkflowController,
        AiSessionController,
        AiUsageController,
        AiEscalationController,
      ],
      providers: [
        // Services
        AiAgentService,
        AiConversationService,
        AiWorkflowService,
        AiToolExecutionService,
        AiEscalationService,
        AiUsageService,
        AiRoutingService,
        AiResponseService,
        AiEventPublisher,
        AiQueueProcessor,
        TenantResolver,
        // Mocked dependencies
        { provide: 'IAiRepository', useValue: mockRepo },
        { provide: AIPlatformClient, useValue: mockAiClient },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ConversationService, useValue: mockConversationService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: CustomerService, useValue: mockCustomerService },
        {
          provide: ConnectorExecutionService,
          useValue: mockConnectorExecutionService,
        },
        { provide: InboxRealtimeService, useValue: mockRealtimeService },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngineService },
        {
          provide: KnowledgeSearchService,
          useValue: mockKnowledgeSearchService,
        },
        {
          provide: KnowledgeChunkService,
          useValue: mockKnowledgeChunkService,
        },
        { provide: InboxService, useValue: mockInboxService },
        { provide: MessageDraftService, useValue: mockMessageDraftService },
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    agentService = module.get<AiAgentService>(AiAgentService);
    conversationServiceAi = module.get<AiConversationService>(
      AiConversationService,
    );
    workflowService = module.get<AiWorkflowService>(AiWorkflowService);
    toolService = module.get<AiToolExecutionService>(AiToolExecutionService);
    escalationService = module.get<AiEscalationService>(AiEscalationService);
    usageService = module.get<AiUsageService>(AiUsageService);
    routingService = module.get<AiRoutingService>(AiRoutingService);
    responseService = module.get<AiResponseService>(AiResponseService);
    processor = module.get<AiQueueProcessor>(AiQueueProcessor);

    agentController = module.get<AiAgentController>(AiAgentController);
    workflowController = module.get<AiWorkflowController>(AiWorkflowController);
    sessionController = module.get<AiSessionController>(AiSessionController);
    usageController = module.get<AiUsageController>(AiUsageController);
    escalationController = module.get<AiEscalationController>(
      AiEscalationController,
    );

    jest.clearAllMocks();

    const sessionMap = new Map();
    mockRepo.saveSession.mockImplementation((s) => {
      sessionMap.set(s.conversationId, s);
      return Promise.resolve(s);
    });
    mockRepo.getSessionByConversationId.mockImplementation((cid) => {
      return Promise.resolve(sessionMap.get(cid) || null);
    });
  });

  describe('AiAgentService', () => {
    it('should create an agent', async () => {
      const dto = {
        name: 'Agent X',
        description: 'Desc',
        agentType: AgentTypeEnum.TECHNICAL,
        defaultWorkflow: 'wf-1',
        systemPromptReference: 'system-prompt',
        configuration: { a: 1 },
      };

      mockRepo.saveAgent.mockImplementation((agent) => Promise.resolve(agent));

      const res = await agentService.createAgent(tenantId, dto);
      expect(res.name).toBe('Agent X');
      expect(res.agentType).toBe(AgentTypeEnum.TECHNICAL);
      expect(mockRepo.saveAgent).toHaveBeenCalled();
    });

    it('should get an agent', async () => {
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Agent X',
        agentType: AgentTypeEnum.SALES,
        status: AgentStatusEnum.ACTIVE,
      });

      mockRepo.getAgentById.mockResolvedValue(agent);

      const res = await agentService.getAgent(tenantId, agentId);
      expect(res.id).toBe(agentId);
      expect(res.name).toBe('Agent X');
    });

    it('should throw NotFoundException if agent not found', async () => {
      mockRepo.getAgentById.mockResolvedValue(null);
      await expect(
        agentService.getAgent(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should find agents', async () => {
      mockRepo.findAgents.mockResolvedValue([]);
      const res = await agentService.findAgents(tenantId);
      expect(res).toEqual([]);
    });

    it('should update an agent', async () => {
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Agent X',
        agentType: AgentTypeEnum.SALES,
        status: AgentStatusEnum.ACTIVE,
      });
      mockRepo.getAgentById.mockResolvedValue(agent);
      mockRepo.saveAgent.mockImplementation((a) => Promise.resolve(a));

      const res = await agentService.updateAgent(tenantId, agentId, {
        name: 'Agent Updated',
      });
      expect(res.name).toBe('Agent Updated');
    });

    it('should delete an agent', async () => {
      mockRepo.deleteAgent.mockResolvedValue(true);
      const res = await agentService.deleteAgent(tenantId, agentId);
      expect(res).toBe(true);
    });

    it('should throw NotFoundException on delete of non-existent agent', async () => {
      mockRepo.deleteAgent.mockResolvedValue(false);
      await expect(
        agentService.deleteAgent(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set agent profile', async () => {
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Agent X',
        agentType: AgentTypeEnum.SALES,
        status: AgentStatusEnum.ACTIVE,
      });
      mockRepo.getAgentById.mockResolvedValue(agent);
      mockRepo.saveAgent.mockImplementation((a) => Promise.resolve(a));

      const profile = {
        knowledgeScope: { a: 1 },
        connectorScope: { b: 2 },
        languageSupport: ['en'],
        escalationRules: { c: 3 },
      };

      const res = await agentService.setAgentProfile(
        tenantId,
        agentId,
        profile,
      );
      expect(res.profile?.languageSupport).toEqual(['en']);
    });

    it('should set agent model config', async () => {
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Agent X',
        agentType: AgentTypeEnum.SALES,
        status: AgentStatusEnum.ACTIVE,
      });
      mockRepo.getAgentById.mockResolvedValue(agent);
      mockRepo.saveAgent.mockImplementation((a) => Promise.resolve(a));

      const modelConfig = {
        modelName: 'gpt-4',
        provider: 'openai',
        temperature: 0.5,
        maxTokens: 500,
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
      };

      const res = await agentService.setAgentModelConfig(
        tenantId,
        agentId,
        modelConfig,
      );
      expect(res.modelConfig?.modelName).toBe('gpt-4');
    });
  });

  describe('AiConversationService', () => {
    it('should get or create a session', async () => {
      mockRepo.getSessionByConversationId.mockResolvedValue(null);
      mockRepo.saveSession.mockImplementation((s) => Promise.resolve(s));

      const res = await conversationServiceAi.getOrCreateSession(
        tenantId,
        conversationId,
        customerId,
        agentId,
      );
      expect(res.conversationId).toBe(conversationId);
      expect(res.customerId).toBe(customerId);
    });

    it('should retrieve existing session', async () => {
      const session = new AiConversationSession('session-id-1', {
        tenantId,
        conversationId,
        customerId,
        agentId,
        sessionState: {},
      });
      mockRepo.getSessionByConversationId.mockResolvedValue(session);

      const res = await conversationServiceAi.getOrCreateSession(
        tenantId,
        conversationId,
        customerId,
        agentId,
      );
      expect(res.id).toBe('session-id-1');
      expect(mockRepo.saveSession).not.toHaveBeenCalled();
    });

    it('should update session state', async () => {
      const session = new AiConversationSession('session-id-1', {
        tenantId,
        conversationId,
        customerId,
        agentId,
        sessionState: {},
      });
      mockRepo.getSessionByConversationId.mockResolvedValue(session);
      mockRepo.saveSession.mockImplementation((s) => Promise.resolve(s));

      const res = await conversationServiceAi.updateSessionState(
        tenantId,
        conversationId,
        { state: 'some-value' },
      );
      expect(res.sessionState.state).toBe('some-value');
      expect(res.contextVersion).toBe(2);
    });

    it('should throw error when updating non-existent session state', async () => {
      mockRepo.getSessionByConversationId.mockResolvedValue(null);
      await expect(
        conversationServiceAi.updateSessionState(tenantId, conversationId, {}),
      ).rejects.toThrow();
    });

    it('should associate workflow execution id', async () => {
      const session = new AiConversationSession('session-id-1', {
        tenantId,
        conversationId,
        customerId,
        agentId,
        sessionState: {},
      });
      mockRepo.getSessionByConversationId.mockResolvedValue(session);
      mockRepo.saveSession.mockImplementation((s) => Promise.resolve(s));

      const res = await conversationServiceAi.associateWorkflow(
        tenantId,
        conversationId,
        'exec-123',
      );
      expect(res.workflowExecutionId).toBe('exec-123');
    });

    it('should throw error when associating workflow to non-existent session', async () => {
      mockRepo.getSessionByConversationId.mockResolvedValue(null);
      await expect(
        conversationServiceAi.associateWorkflow(
          tenantId,
          conversationId,
          'exec-123',
        ),
      ).rejects.toThrow();
    });

    it('should recall memory and get context', async () => {
      mockAiClient.recallMemory.mockResolvedValue({ memo: 'val' });
      mockAiClient.getConversationContext.mockResolvedValue([{ role: 'user' }]);

      const memory = await conversationServiceAi.recallMemory(
        tenantId,
        'query',
        'key',
      );
      const ctx = await conversationServiceAi.getConversationContext(
        tenantId,
        conversationId,
      );

      expect(memory.memo).toBe('val');
      expect(ctx[0].role).toBe('user');
    });
  });

  describe('AiWorkflowService', () => {
    it('should trigger and run a workflow successfully', async () => {
      mockRepo.saveWorkflowExecution.mockImplementation((e) =>
        Promise.resolve(e),
      );
      mockAiClient.runWorkflow.mockResolvedValue({
        tokensUsed: 150,
        estimatedCost: 0.02,
      });

      const res = await workflowService.triggerWorkflow(
        tenantId,
        'wf-1',
        conversationId,
        { param: 1 },
      );
      expect(res.status).toBe(WorkflowStatusEnum.COMPLETED);
      expect(res.tokensUsed).toBe(150);
      expect(res.estimatedCost).toBe(0.02);
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'ai-queue',
        'ai-workflow-job',
        expect.any(Object),
      );
    });

    it('should fail and log errors if client run fails', async () => {
      mockRepo.saveWorkflowExecution.mockImplementation((e) =>
        Promise.resolve(e),
      );
      mockAiClient.runWorkflow.mockRejectedValue(
        new Error('AI execution failure'),
      );

      await expect(
        workflowService.triggerWorkflow(tenantId, 'wf-1', conversationId),
      ).rejects.toThrow('AI execution failure');
    });

    it('should retrieve workflow execution', async () => {
      const execution = new AiWorkflowExecution('exec-1', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.PENDING,
      });
      mockRepo.getWorkflowExecutionById.mockResolvedValue(execution);

      const res = await workflowService.getExecution(tenantId, 'exec-1');
      expect(res.id).toBe('exec-1');
    });

    it('should throw NotFoundException on getExecution of non-existent execution', async () => {
      mockRepo.getWorkflowExecutionById.mockResolvedValue(null);
      await expect(
        workflowService.getExecution(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle timeoutExecution', async () => {
      const execution = new AiWorkflowExecution('exec-1', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.RUNNING,
      });
      mockRepo.getWorkflowExecutionById.mockResolvedValue(execution);
      mockRepo.saveWorkflowExecution.mockImplementation((e) =>
        Promise.resolve(e),
      );

      await workflowService.timeoutExecution(tenantId, 'exec-1');
      expect(execution.status).toBe(WorkflowStatusEnum.TIMEOUT);
    });
  });

  describe('AiToolExecutionService', () => {
    it('should execute a tool capability successfully', async () => {
      mockRepo.saveToolRequest.mockImplementation((r) => Promise.resolve(r));
      mockRepo.saveToolResult.mockImplementation((r) => Promise.resolve(r));
      mockConnectorExecutionService.executeCapability.mockResolvedValue({
        status: 'delivered',
      });
      mockAiClient.submitToolResult.mockResolvedValue({ success: true });

      const res = await toolService.executeTool(
        tenantId,
        'exec-123',
        'wf-1',
        'shopify-connector',
        'ORDER_TRACKING',
        { orderId: '123' },
      );

      expect(res.status).toBe('delivered');
      expect(
        mockConnectorExecutionService.executeCapability,
      ).toHaveBeenCalled();
      expect(mockAiClient.submitToolResult).toHaveBeenCalled();
    });

    it('should record failure and submit failure state on exception', async () => {
      mockRepo.saveToolRequest.mockImplementation((r) => Promise.resolve(r));
      mockRepo.saveToolResult.mockImplementation((r) => Promise.resolve(r));
      mockConnectorExecutionService.executeCapability.mockRejectedValue(
        new Error('Connector down'),
      );

      await expect(
        toolService.executeTool(
          tenantId,
          'exec-123',
          'wf-1',
          'shopify-connector',
          'ORDER_TRACKING',
          {},
        ),
      ).rejects.toThrow('Connector down');

      expect(mockAiClient.submitToolResult).toHaveBeenCalledWith(
        tenantId,
        'wf-1',
        expect.any(String),
        expect.objectContaining({ error: 'Connector down' }),
        'FAILED',
      );
    });
  });

  describe('AiEscalationService', () => {
    it('should route to human if keyword match is found', async () => {
      mockRepo.saveEscalation.mockImplementation((e) => Promise.resolve(e));
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });

      const res = await escalationService.evaluateEscalation(
        tenantId,
        conversationId,
        'Please let me talk to a real person',
        0.9,
        0.0,
      );

      expect(res).toBe(true);
      expect(mockRepo.saveEscalation).toHaveBeenCalled();
    });

    it('should route to human if confidence score is low', async () => {
      mockRepo.saveEscalation.mockImplementation((e) => Promise.resolve(e));
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });

      const res = await escalationService.evaluateEscalation(
        tenantId,
        conversationId,
        'Question',
        0.4, // low confidence
        0.0,
      );

      expect(res).toBe(true);
    });

    it('should route to human if sentiment score is highly negative', async () => {
      mockRepo.saveEscalation.mockImplementation((e) => Promise.resolve(e));
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });

      const res = await escalationService.evaluateEscalation(
        tenantId,
        conversationId,
        'This app is garbage!',
        0.9,
        -0.7, // negative sentiment
      );

      expect(res).toBe(true);
    });

    it('should route to human if customer is VIP', async () => {
      mockRepo.saveEscalation.mockImplementation((e) => Promise.resolve(e));
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
        customerId,
      });
      mockCustomerService.findById.mockResolvedValue({
        id: customerId,
        metadata: { tier: 'VIP' },
      });

      const res = await escalationService.evaluateEscalation(
        tenantId,
        conversationId,
        'Simple question',
        0.9,
        0.0,
      );

      expect(res).toBe(true);
    });

    it('should route to human if policy violation keyword matches', async () => {
      mockRepo.saveEscalation.mockImplementation((e) => Promise.resolve(e));
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });

      const res = await escalationService.evaluateEscalation(
        tenantId,
        conversationId,
        'I want to exploit the system',
        0.9,
        0.0,
      );

      expect(res).toBe(true);
    });

    it('should return false if no rules match', async () => {
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
        customerId,
      });
      mockCustomerService.findById.mockResolvedValue({
        id: customerId,
        metadata: { tier: 'STANDARD' },
      });

      const res = await escalationService.evaluateEscalation(
        tenantId,
        conversationId,
        'Just checking status of my package',
        0.9,
        0.1,
      );

      expect(res).toBe(false);
    });

    it('should get escalation', async () => {
      const escalation = new AiEscalation('esc-1', {
        tenantId,
        conversationId,
        reason: 'low_confidence',
        escalatedTo: EscalationTargetEnum.AGENT,
        status: EscalationStatusEnum.PENDING,
      });
      mockRepo.getEscalationById.mockResolvedValue(escalation);

      const res = await escalationService.getEscalation(tenantId, 'esc-1');
      expect(res.id).toBe('esc-1');
    });

    it('should throw NotFoundException on getEscalation of non-existent escalation', async () => {
      mockRepo.getEscalationById.mockResolvedValue(null);
      await expect(
        escalationService.getEscalation(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should find escalations', async () => {
      mockRepo.findEscalations.mockResolvedValue([]);
      const res = await escalationService.findEscalations(tenantId, 'PENDING');
      expect(res).toEqual([]);
    });

    it('should resolve escalation', async () => {
      const escalation = new AiEscalation('esc-1', {
        tenantId,
        conversationId,
        reason: 'low_confidence',
        escalatedTo: EscalationTargetEnum.AGENT,
        status: EscalationStatusEnum.PENDING,
      });
      mockRepo.getEscalationById.mockResolvedValue(escalation);
      mockRepo.saveEscalation.mockImplementation((e) => Promise.resolve(e));

      const res = await escalationService.resolveEscalation(tenantId, 'esc-1');
      expect(res.status).toBe(EscalationStatusEnum.RESOLVED);
    });
  });

  describe('AiUsageService', () => {
    it('should record usage metrics', async () => {
      mockRepo.getUsageMetric.mockResolvedValue(null);
      mockRepo.saveUsageMetric.mockImplementation((m) => Promise.resolve(m));

      const res = await usageService.recordUsage(
        tenantId,
        agentId,
        100,
        0.05,
        true,
        2,
      );
      expect(res.agentId).toBe(agentId);
      expect(res.tokens).toBe(100);
      expect(res.cost).toBeCloseTo(0.05);
      expect(res.workflowCount).toBe(1);
      expect(res.toolCalls).toBe(2);
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'ai-queue',
        'ai-usage-job',
        expect.any(Object),
      );
    });

    it('should log response and trigger events', async () => {
      mockRepo.logResponse.mockResolvedValue(undefined);

      await usageService.logResponse(
        tenantId,
        conversationId,
        'msg-1',
        'exec-1',
        'AUTOMATED',
        150,
        0.9,
        100,
        0.02,
      );
      expect(mockRepo.logResponse).toHaveBeenCalled();
    });

    it('should retrieve usage metrics', async () => {
      mockRepo.findUsageMetrics.mockResolvedValue([]);
      const res = await usageService.getUsageMetrics(tenantId);
      expect(res).toEqual([]);
    });
  });

  describe('AiRoutingService', () => {
    it('should return null if no agents exist', async () => {
      mockRepo.findAgents.mockResolvedValue([]);
      const res = await routingService.selectAgent(tenantId);
      expect(res).toBeNull();
    });

    it('should match language scope of agent', async () => {
      const agentEng = AiAgent.create('eng-agent', {
        tenantId,
        name: 'English Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
        profile: { languageSupport: ['en'] },
      });
      const agentEs = AiAgent.create('es-agent', {
        tenantId,
        name: 'Spanish Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
        profile: { languageSupport: ['es'] },
      });

      mockRepo.findAgents.mockResolvedValue([agentEng, agentEs]);

      const res = await routingService.selectAgent(tenantId, {
        language: 'es',
      });
      expect(res?.id).toBe('es-agent');
    });

    it('should match category/type', async () => {
      const agentBilling = AiAgent.create('bill-agent', {
        tenantId,
        name: 'Billing Agent',
        agentType: AgentTypeEnum.BILLING,
        status: AgentStatusEnum.ACTIVE,
      });
      const agentSupport = AiAgent.create('support-agent', {
        tenantId,
        name: 'Support Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
      });

      mockRepo.findAgents.mockResolvedValue([agentBilling, agentSupport]);

      const res = await routingService.selectAgent(tenantId, {
        category: 'BILLING',
      });
      expect(res?.id).toBe('bill-agent');
    });

    it('should select default workflow or fallback static workflow', () => {
      const agentWithWf = AiAgent.create('agent-1', {
        tenantId,
        name: 'Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
        defaultWorkflow: 'custom-wf',
      });
      const agentNoWf = AiAgent.create('agent-2', {
        tenantId,
        name: 'Agent 2',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
      });

      expect(routingService.selectWorkflow(agentWithWf)).toBe('custom-wf');
      expect(routingService.selectWorkflow(agentNoWf)).toBe(
        'default-agent-workflow-run',
      );
    });
  });

  describe('AiResponseService', () => {
    it('should return immediately if conversation is not found', async () => {
      mockConversationService.findById.mockResolvedValue(null);
      const res = await responseService.processInboundMessage(
        tenantId,
        'msg-1',
        conversationId,
        'text',
      );
      expect(res).toBeUndefined();
    });

    it('should return immediately if no active agent found', async () => {
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });
      mockRepo.findAgents.mockResolvedValue([]);

      const res = await responseService.processInboundMessage(
        tenantId,
        'msg-1',
        conversationId,
        'text',
      );
      expect(res).toBeUndefined();
    });

    it('should return escalated details if escalation rule matches', async () => {
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Support Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
      });
      mockRepo.findAgents.mockResolvedValue([agent]);

      const res = await responseService.processInboundMessage(
        tenantId,
        'msg-1',
        conversationId,
        'Please connect me to human agent',
      );
      expect(res).toEqual({ escalated: true });
    });

    it('should successfully run workflow and generate masked response', async () => {
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
        customerId,
        language: { value: 'en' },
      });
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Support Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
        systemPromptReference: 'You are custom support agent.',
        configuration: {},
      });
      mockRepo.findAgents.mockResolvedValue([agent]);
      mockAiClient.getConversationContext.mockResolvedValue([]);

      const execution = new AiWorkflowExecution('exec-id-1', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.PENDING,
      });
      mockRepo.saveWorkflowExecution.mockImplementation((e) =>
        Promise.resolve(e),
      );
      mockAiClient.runWorkflow.mockResolvedValue({
        tokensUsed: 50,
        estimatedCost: 0.01,
      });

      mockAiClient.generate.mockResolvedValue({
        text: 'Contact support at billing@easydev.ai or visa card 4111222233334444',
        confidence: 0.95,
        tokensUsed: 120,
        cost: 0.003,
      });

      mockMessageService.create.mockResolvedValue({ id: 'out-msg-1' });
      mockRepo.getUsageMetric.mockResolvedValue(null);
      mockRepo.saveUsageMetric.mockImplementation((m) => Promise.resolve(m));

      const res = await responseService.processInboundMessage(
        tenantId,
        'msg-1',
        conversationId,
        'Hello',
      );
      expect(res.escalated).toBe(false);
      expect(res.messageId).toBe('out-msg-1');
      expect(res.reply).toContain('[EMAIL_HIDDEN]');
      expect(res.reply).toContain('[CARD_HIDDEN]');
    });

    it('should create escalation and throw if processing fails', async () => {
      mockConversationService.findById.mockResolvedValue({
        id: conversationId,
      });
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Support Agent',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
      });
      mockRepo.findAgents.mockResolvedValue([agent]);
      mockRepo.getSessionByConversationId.mockResolvedValue(null);

      mockAiClient.getConversationContext.mockRejectedValue(
        new Error('Context unavailable'),
      );

      await expect(
        responseService.processInboundMessage(
          tenantId,
          'msg-1',
          conversationId,
          'Hello',
        ),
      ).rejects.toThrow('Context unavailable');

      expect(mockRepo.saveEscalation).toHaveBeenCalled();
    });
  });

  describe('Controllers', () => {
    const headers = { 'x-tenant-id': tenantId };

    it('AiAgentController endpoints', async () => {
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Agent C',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
      });

      jest.spyOn(agentService, 'createAgent').mockResolvedValue(agent);
      jest.spyOn(agentService, 'getAgent').mockResolvedValue(agent);
      jest.spyOn(agentService, 'findAgents').mockResolvedValue([agent]);
      jest.spyOn(agentService, 'updateAgent').mockResolvedValue(agent);
      jest.spyOn(agentService, 'deleteAgent').mockResolvedValue(true);
      jest.spyOn(agentService, 'setAgentProfile').mockResolvedValue(agent);
      jest.spyOn(agentService, 'setAgentModelConfig').mockResolvedValue(agent);

      const created = await agentController.createAgent(tenantId, {
        name: 'Agent C',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
      });
      expect(created.id).toBe(agentId);

      const got = await agentController.getAgent(tenantId, agentId);
      expect(got.id).toBe(agentId);

      const listed = await agentController.findAgents(tenantId, {});
      expect(listed[0].id).toBe(agentId);

      const updated = await agentController.updateAgent(tenantId, agentId, {
        name: 'New Name',
      });
      expect(updated.id).toBe(agentId);

      const deleted = await agentController.deleteAgent(tenantId, agentId);
      expect(deleted.success).toBe(true);

      const profiled = await agentController.setProfile(tenantId, agentId, {});
      expect(profiled.id).toBe(agentId);

      const configured = await agentController.setModelConfig(
        tenantId,
        agentId,
        {
          modelName: 'gpt-4',
          provider: 'openai',
          temperature: 0.7,
          maxTokens: 1000,
          topP: 1.0,
          presencePenalty: 0,
          frequencyPenalty: 0,
        },
      );
      expect(configured.id).toBe(agentId);
    });

    it('AiWorkflowController endpoints', async () => {
      const execution = new AiWorkflowExecution('exec-1', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.PENDING,
      });

      jest
        .spyOn(workflowService, 'triggerWorkflow')
        .mockResolvedValue(execution);
      jest.spyOn(workflowService, 'getExecution').mockResolvedValue(execution);

      const triggered = await workflowController.triggerWorkflow(tenantId, {
        workflowId: 'wf-1',
        conversationId,
      });
      expect(triggered.id).toBe('exec-1');

      const got = await workflowController.getExecution(tenantId, 'exec-1');
      expect(got.id).toBe('exec-1');
    });

    it('AiSessionController endpoints', async () => {
      const session = new AiConversationSession('session-1', {
        tenantId,
        conversationId,
        customerId,
        agentId,
        sessionState: {},
      });

      jest
        .spyOn(conversationServiceAi, 'getOrCreateSession')
        .mockResolvedValue(session);
      jest
        .spyOn(conversationServiceAi, 'updateSessionState')
        .mockResolvedValue(session);

      const got = await sessionController.getSession(tenantId, conversationId);
      expect(got.id).toBe('session-1');

      const updated = await sessionController.updateSessionState(
        tenantId,
        conversationId,
        { active: true },
      );
      expect(updated.id).toBe('session-1');
    });

    it('AiUsageController endpoints', async () => {
      jest.spyOn(usageService, 'getUsageMetrics').mockResolvedValue([]);
      const metrics = await usageController.getUsageMetrics(tenantId);
      expect(metrics).toEqual([]);
    });

    it('AiEscalationController endpoints', async () => {
      const escalation = new AiEscalation('esc-1', {
        tenantId,
        conversationId,
        reason: 'low_confidence',
        escalatedTo: EscalationTargetEnum.AGENT,
        status: EscalationStatusEnum.PENDING,
      });

      jest
        .spyOn(escalationService, 'findEscalations')
        .mockResolvedValue([escalation]);
      jest
        .spyOn(escalationService, 'resolveEscalation')
        .mockResolvedValue(escalation);

      const listed = await escalationController.getEscalations(
        tenantId,
        'PENDING',
      );
      expect(listed[0].id).toBe('esc-1');

      const resolved = await escalationController.resolveEscalation(
        tenantId,
        'esc-1',
      );
      expect(resolved.id).toBe('esc-1');
    });
  });

  describe('AiQueueProcessor', () => {
    it('should process ai-workflow-job and return success', async () => {
      const res = await processor.handleJob({
        name: 'ai-workflow-job',
        data: { workflowExecutionId: 'exec-1', tenantId },
      } as any);

      expect(res).toEqual({ success: true });
    });

    it('should process ai-tool-execution-job and call tool service', async () => {
      jest
        .spyOn(toolService, 'executeTool')
        .mockResolvedValue({ result: 'ok' });

      const res = await processor.handleJob({
        name: 'ai-tool-execution-job',
        data: {
          tenantId,
          workflowExecutionId: 'exec-1',
          workflowId: 'wf-1',
          toolName: 't-1',
          capability: 'c-1',
          payload: { query: 'test' },
        },
      } as any);

      expect(res).toEqual({ result: 'ok' });
      expect(toolService.executeTool).toHaveBeenCalledWith(
        tenantId,
        'exec-1',
        'wf-1',
        't-1',
        'c-1',
        { query: 'test' },
      );
    });

    it('should process ai-escalation-job and return status', async () => {
      const res = await processor.handleJob({
        name: 'ai-escalation-job',
        data: { escalationId: 'esc-123', tenantId },
      } as any);

      expect(res).toEqual({ status: 'processed', escalationId: 'esc-123' });
    });

    it('should process ai-usage-job and call usage service', async () => {
      const metric = new AiUsageMetric('m-1', {
        tenantId,
        agentId,
        date: '2026-06-20',
        requests: 0,
        tokens: 0,
        cost: 0,
        workflowCount: 0,
        toolCalls: 0,
      });
      jest.spyOn(usageService, 'recordUsage').mockResolvedValue(metric);

      const res = await processor.handleJob({
        name: 'ai-usage-job',
        data: {
          tenantId,
          agentId,
          tokensUsed: 100,
          cost: 0.01,
          toolCalls: 1,
        },
      } as any);

      expect(res).toBeDefined();
      expect(usageService.recordUsage).toHaveBeenCalledWith(
        tenantId,
        agentId,
        100,
        0.01,
        true,
        1,
      );
    });

    it('should process ai-retry-job and retry triggering workflow', async () => {
      const execution = new AiWorkflowExecution('exec-1', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.RUNNING,
      });
      jest
        .spyOn(workflowService, 'triggerWorkflow')
        .mockResolvedValue(execution);

      const res = await processor.handleJob({
        name: 'ai-retry-job',
        data: {
          tenantId,
          workflowId: 'wf-1',
          conversationId,
          variables: { a: 1 },
        },
      } as any);

      expect(res).toBeDefined();
      expect(workflowService.triggerWorkflow).toHaveBeenCalledWith(
        tenantId,
        'wf-1',
        conversationId,
        { a: 1 },
      );
    });

    it('should return retried: false if retry job data is missing parameters', async () => {
      const res = await processor.handleJob({
        name: 'ai-retry-job',
        data: { tenantId },
      } as any);

      expect(res).toEqual({ retried: false });
    });

    it('should throw error for unknown job name', async () => {
      await expect(
        processor.handleJob({
          name: 'unknown-job-type',
          data: {},
        } as any),
      ).rejects.toThrow('Unknown job name: unknown-job-type');
    });
  });
});
