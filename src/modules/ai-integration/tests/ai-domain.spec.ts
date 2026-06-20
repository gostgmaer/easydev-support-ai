import {
  AgentId,
  WorkflowExecutionId,
  SessionId,
  ConfidenceScore,
  TokenUsage,
  CostValue,
  AgentTypeEnum,
  AgentStatusEnum,
  SessionStateEnum,
  WorkflowStatusEnum,
  ToolStatusEnum,
  EscalationStatusEnum,
  EscalationTargetEnum,
} from '../domain/value-objects';
import { AiAgent } from '../domain/ai-agent.aggregate';
import {
  AiConversationSession,
  AiWorkflowExecution,
  AiToolRequest,
  AiToolResult,
  AiEscalation,
  AiUsageMetric,
} from '../domain/entities';

describe('AI Integration Domain Model', () => {
  const tenantId = 'tenant-123';
  const agentId = 'agent-456';
  const conversationId = 'conv-789';
  const customerId = 'cust-101';

  describe('Value Objects', () => {
    it('should create valid AgentId', () => {
      const vo = AgentId.create(agentId);
      expect(vo.value).toBe(agentId);
    });

    it('should throw on empty AgentId', () => {
      expect(() => AgentId.create('')).toThrow('AgentId cannot be empty');
    });

    it('should create valid WorkflowExecutionId', () => {
      const vo = WorkflowExecutionId.create('exec-999');
      expect(vo.value).toBe('exec-999');
    });

    it('should throw on empty WorkflowExecutionId', () => {
      expect(() => WorkflowExecutionId.create('')).toThrow(
        'WorkflowExecutionId cannot be empty',
      );
    });

    it('should create valid SessionId', () => {
      const vo = SessionId.create('session-000');
      expect(vo.value).toBe('session-000');
    });

    it('should throw on empty SessionId', () => {
      expect(() => SessionId.create('')).toThrow('SessionId cannot be empty');
    });

    it('should create valid ConfidenceScore', () => {
      const score = ConfidenceScore.create(0.85);
      expect(score.value).toBe(0.85);
    });

    it('should throw on invalid ConfidenceScore', () => {
      expect(() => ConfidenceScore.create(-0.1)).toThrow(
        'ConfidenceScore must be between 0.0 and 1.0',
      );
      expect(() => ConfidenceScore.create(1.1)).toThrow(
        'ConfidenceScore must be between 0.0 and 1.0',
      );
    });

    it('should create valid TokenUsage', () => {
      const tokens = TokenUsage.create(150);
      expect(tokens.value).toBe(150);
    });

    it('should throw on negative TokenUsage', () => {
      expect(() => TokenUsage.create(-5)).toThrow(
        'TokenUsage cannot be negative',
      );
    });

    it('should create valid CostValue', () => {
      const cost = CostValue.create(0.002);
      expect(cost.value).toBe(0.002);
    });

    it('should throw on negative CostValue', () => {
      expect(() => CostValue.create(-0.01)).toThrow(
        'CostValue cannot be negative',
      );
    });
  });

  describe('AiAgent Aggregate', () => {
    it('should create and update an AiAgent aggregate', () => {
      const agent = AiAgent.create(agentId, {
        tenantId,
        name: 'Support Agent',
        description: 'Customer Support AI',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.DRAFT,
        defaultWorkflow: 'workflow-standard',
        systemPromptReference: 'prompts/support.txt',
        configuration: { model: 'gpt-4' },
      });

      expect(agent.id).toBe(agentId);
      expect(agent.name).toBe('Support Agent');
      expect(agent.agentType).toBe(AgentTypeEnum.CUSTOMER_SUPPORT);
      expect(agent.status).toBe(AgentStatusEnum.DRAFT);
      expect(agent.configuration?.model).toBe('gpt-4');

      agent.update({
        name: 'New Support Agent',
        status: AgentStatusEnum.ACTIVE,
      });

      expect(agent.name).toBe('New Support Agent');
      expect(agent.status).toBe(AgentStatusEnum.ACTIVE);

      agent.setProfile({
        knowledgeScope: { docs: ['help-docs'] },
        languageSupport: ['en', 'es'],
      });

      expect(agent.profile?.languageSupport).toContain('es');

      agent.setModelConfig({
        modelName: 'claude-3',
        provider: 'anthropic',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        presencePenalty: 0,
        frequencyPenalty: 0,
      });

      expect(agent.modelConfig?.modelName).toBe('claude-3');
    });
  });

  describe('AiConversationSession Entity', () => {
    it('should update session state and associate workflows', () => {
      const session = new AiConversationSession('session-1', {
        tenantId,
        conversationId,
        customerId,
        agentId,
        sessionState: { status: SessionStateEnum.ACTIVE },
      });

      expect(session.customerId).toBe(customerId);
      expect(session.contextVersion).toBe(1);

      session.updateState({ lastQuestion: 'Hi' });
      expect(session.sessionState.lastQuestion).toBe('Hi');
      expect(session.contextVersion).toBe(2);

      session.associateWorkflow('exec-123');
      expect(session.workflowExecutionId).toBe('exec-123');
    });
  });

  describe('AiWorkflowExecution Entity', () => {
    it('should transition statuses and calculate duration', async () => {
      const execution = new AiWorkflowExecution('exec-1', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.PENDING,
      });

      expect(execution.status).toBe(WorkflowStatusEnum.PENDING);

      execution.start();
      expect(execution.status).toBe(WorkflowStatusEnum.RUNNING);

      // Directly set internal props startedAt to simulate elapsed execution duration
      (execution as any).props.startedAt = new Date(Date.now() - 150);

      execution.complete(100, 0.05);
      expect(execution.status).toBe(WorkflowStatusEnum.COMPLETED);
      expect(execution.tokensUsed).toBe(100);
      expect(execution.estimatedCost).toBe(0.05);
      expect(execution.executionTimeMs).toBeGreaterThanOrEqual(150);

      // Fail transition
      const execution2 = new AiWorkflowExecution('exec-2', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.RUNNING,
      });
      execution2.fail('Something failed');
      expect(execution2.status).toBe(WorkflowStatusEnum.FAILED);

      // Timeout transition
      const execution3 = new AiWorkflowExecution('exec-3', {
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.RUNNING,
      });
      execution3.timeout();
      expect(execution3.status).toBe(WorkflowStatusEnum.TIMEOUT);
    });
  });

  describe('AiToolRequest and AiToolResult Entities', () => {
    it('should transition request statuses', () => {
      const request = new AiToolRequest('req-1', {
        tenantId,
        workflowExecutionId: 'exec-1',
        toolName: 'knowledge-search',
        capability: 'search',
        payload: { query: 'refund policy' },
        status: ToolStatusEnum.PENDING,
      });

      expect(request.status).toBe(ToolStatusEnum.PENDING);
      request.complete();
      expect(request.status).toBe(ToolStatusEnum.SUCCESS);

      const request2 = new AiToolRequest('req-2', {
        tenantId,
        workflowExecutionId: 'exec-1',
        toolName: 'knowledge-search',
        capability: 'search',
        payload: { query: 'refund policy' },
        status: ToolStatusEnum.PENDING,
      });
      request2.fail();
      expect(request2.status).toBe(ToolStatusEnum.FAILED);
    });

    it('should instantiate AiToolResult', () => {
      const result = new AiToolResult('res-1', {
        tenantId,
        toolRequestId: 'req-1',
        response: { result: 'ok' },
        status: ToolStatusEnum.SUCCESS,
      });

      expect(result.toolRequestId).toBe('req-1');
      expect(result.response.result).toBe('ok');
    });
  });

  describe('AiEscalation Entity', () => {
    it('should resolve escalations', () => {
      const escalation = new AiEscalation('esc-1', {
        tenantId,
        conversationId,
        reason: 'low_confidence',
        confidenceScore: 0.2,
        sentimentScore: 0.1,
        escalatedTo: EscalationTargetEnum.AGENT,
        status: EscalationStatusEnum.PENDING,
      });

      expect(escalation.status).toBe(EscalationStatusEnum.PENDING);
      escalation.resolve();
      expect(escalation.status).toBe(EscalationStatusEnum.RESOLVED);
    });
  });

  describe('AiUsageMetric Entity', () => {
    it('should record requests', () => {
      const usage = new AiUsageMetric('usage-1', {
        tenantId,
        agentId,
        date: '2026-06-20',
        requests: 10,
        tokens: 1000,
        cost: 0.5,
        workflowCount: 2,
        toolCalls: 5,
      });

      usage.recordRequest(200, 0.1, true, 2);
      expect(usage.requests).toBe(11);
      expect(usage.tokens).toBe(1200);
      expect(usage.cost).toBeCloseTo(0.6);
      expect(usage.workflowCount).toBe(3);
      expect(usage.toolCalls).toBe(7);
    });
  });
});
