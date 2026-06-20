import { DrizzleAiRepository } from '../repositories/drizzle-ai.repository';
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
      aiAgents: { id: 'aiAgents.id', tenantId: 'aiAgents.tenantId' },
      aiAgentProfiles: {
        agentId: 'aiAgentProfiles.agentId',
        tenantId: 'aiAgentProfiles.tenantId',
      },
      aiModelConfigurations: {
        agentId: 'aiModelConfigurations.agentId',
        tenantId: 'aiModelConfigurations.tenantId',
      },
      aiConversationSessions: {
        id: 'aiConversationSessions.id',
        tenantId: 'aiConversationSessions.tenantId',
        conversationId: 'aiConversationSessions.conversationId',
      },
      aiWorkflowExecutions: {
        id: 'aiWorkflowExecutions.id',
        tenantId: 'aiWorkflowExecutions.tenantId',
      },
      aiToolRequests: {
        id: 'aiToolRequests.id',
        tenantId: 'aiToolRequests.tenantId',
      },
      aiToolResults: {
        id: 'aiToolResults.id',
        tenantId: 'aiToolResults.tenantId',
        toolRequestId: 'aiToolResults.toolRequestId',
      },
      aiEscalations: {
        id: 'aiEscalations.id',
        tenantId: 'aiEscalations.tenantId',
        status: 'aiEscalations.status',
      },
      aiUsageMetrics: {
        id: 'aiUsageMetrics.id',
        tenantId: 'aiUsageMetrics.tenantId',
        agentId: 'aiUsageMetrics.agentId',
        date: 'aiUsageMetrics.date',
      },
      aiResponseLogs: {
        id: 'aiResponseLogs.id',
        tenantId: 'aiResponseLogs.tenantId',
      },
    },
  };
});

describe('AI Integration Drizzle Repository', () => {
  let repo: DrizzleAiRepository;
  const tenantId = 'tenant-123';
  const agentId = 'agent-123';
  const conversationId = 'conv-123';

  beforeEach(() => {
    repo = new DrizzleAiRepository();
    mockResults = [];
    jest.clearAllMocks();
  });

  it('should save and update an agent aggregate (without profile/config)', async () => {
    const agent = AiAgent.create(agentId, {
      tenantId,
      name: 'Agent A',
      agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
      status: AgentStatusEnum.ACTIVE,
    });

    // Mock existing select check (exists)
    mockResults.push([{ id: agentId }]);
    const saved = await repo.saveAgent(agent, tenantId);
    expect(saved.id).toBe(agentId);

    // Mock existing check (does not exist)
    mockResults.push([]);
    const savedNew = await repo.saveAgent(agent, tenantId);
    expect(savedNew.id).toBe(agentId);
  });

  it('should save agent aggregate along with profile and model config', async () => {
    const agent = AiAgent.create(agentId, {
      tenantId,
      name: 'Agent A',
      agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
      status: AgentStatusEnum.ACTIVE,
    });
    agent.setProfile({
      languageSupport: ['en', 'fr'],
    });
    agent.setModelConfig({
      modelName: 'gpt-4',
      provider: 'openai',
      temperature: 0.5,
      maxTokens: 500,
      topP: 1.0,
      presencePenalty: 0,
      frequencyPenalty: 0,
    });

    // Mock exists for Agent, exists for Profile, exists for modelConfig
    mockResults.push([{ id: agentId }]);
    mockResults.push([{ agentId }]);
    mockResults.push([{ agentId }]);

    const saved = await repo.saveAgent(agent, tenantId);
    expect(saved.id).toBe(agentId);
  });

  it('should retrieve agent by id with details', async () => {
    // Mock select agent row
    mockResults.push([
      {
        id: agentId,
        tenantId,
        name: 'Agent A',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    // Mock select profile row
    mockResults.push([
      {
        agentId,
        tenantId,
        languageSupport: ['en'],
      },
    ]);
    // Mock select config row
    mockResults.push([
      {
        agentId,
        tenantId,
        modelName: 'gpt-4',
        provider: 'openai',
        temperature: 0.5,
        maxTokens: 500,
        topP: 1.0,
        presencePenalty: 0,
        frequencyPenalty: 0,
      },
    ]);

    const res = await repo.getAgentById(agentId, tenantId);
    expect(res).not.toBeNull();
    expect(res?.id).toBe(agentId);
    expect(res?.profile?.languageSupport).toContain('en');
    expect(res?.modelConfig?.modelName).toBe('gpt-4');
  });

  it('should return null if agent not found by id', async () => {
    mockResults.push([]);
    const res = await repo.getAgentById(agentId, tenantId);
    expect(res).toBeNull();
  });

  it('should find agents', async () => {
    mockResults.push([
      {
        id: agentId,
        tenantId,
        name: 'Agent A',
        agentType: AgentTypeEnum.CUSTOMER_SUPPORT,
        status: AgentStatusEnum.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockResults.push([]); // profile
    mockResults.push([]); // config

    const res = await repo.findAgents(tenantId);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe(agentId);
  });

  it('should delete agent', async () => {
    mockResults.push([{ id: agentId }]); // check existing
    const res1 = await repo.deleteAgent(agentId, tenantId);
    expect(res1).toBe(true);

    mockResults.push([]); // does not exist
    const res2 = await repo.deleteAgent(agentId, tenantId);
    expect(res2).toBe(false);
  });

  it('should save and get session', async () => {
    const session = new AiConversationSession('session-1', {
      tenantId,
      conversationId,
      customerId: 'cust-123',
      agentId,
      sessionState: {},
    });

    mockResults.push([{ id: 'session-1' }]);
    const saved = await repo.saveSession(session, tenantId);
    expect(saved.id).toBe('session-1');

    mockResults.push([
      {
        id: 'session-1',
        tenantId,
        conversationId,
        customerId: 'cust-123',
        agentId,
        sessionState: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const got = await repo.getSessionByConversationId(conversationId, tenantId);
    expect(got?.id).toBe('session-1');

    // Get non-existent session
    mockResults.push([]);
    const gotNone = await repo.getSessionByConversationId('other', tenantId);
    expect(gotNone).toBeNull();
  });

  it('should save and get workflow execution', async () => {
    const execution = new AiWorkflowExecution('exec-1', {
      tenantId,
      workflowId: 'wf-1',
      conversationId,
      status: WorkflowStatusEnum.PENDING,
    });

    mockResults.push([{ id: 'exec-1' }]);
    const saved = await repo.saveWorkflowExecution(execution, tenantId);
    expect(saved.id).toBe('exec-1');

    mockResults.push([
      {
        id: 'exec-1',
        tenantId,
        workflowId: 'wf-1',
        conversationId,
        status: WorkflowStatusEnum.PENDING,
        startedAt: new Date(),
        completedAt: new Date(),
        executionTimeMs: 100,
        tokensUsed: 100,
        estimatedCost: '0.01',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const got = await repo.getWorkflowExecutionById('exec-1', tenantId);
    expect(got?.id).toBe('exec-1');

    // Get non-existent execution
    mockResults.push([]);
    const gotNone = await repo.getWorkflowExecutionById('other', tenantId);
    expect(gotNone).toBeNull();
  });

  it('should save and get tool request', async () => {
    const request = new AiToolRequest('req-1', {
      tenantId,
      workflowExecutionId: 'exec-1',
      toolName: 'tool',
      capability: 'cap',
      payload: {},
      status: ToolStatusEnum.PENDING,
    });

    mockResults.push([{ id: 'req-1' }]);
    const saved = await repo.saveToolRequest(request, tenantId);
    expect(saved.id).toBe('req-1');

    mockResults.push([
      {
        id: 'req-1',
        tenantId,
        workflowExecutionId: 'exec-1',
        toolName: 'tool',
        capability: 'cap',
        payload: {},
        status: ToolStatusEnum.PENDING,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const got = await repo.getToolRequestById('req-1', tenantId);
    expect(got?.id).toBe('req-1');

    // Get non-existent request
    mockResults.push([]);
    const gotNone = await repo.getToolRequestById('other', tenantId);
    expect(gotNone).toBeNull();
  });

  it('should save and get tool result', async () => {
    const result = new AiToolResult('res-1', {
      tenantId,
      toolRequestId: 'req-1',
      response: {},
      status: ToolStatusEnum.SUCCESS,
    });

    mockResults.push([{ id: 'res-1' }]);
    const saved = await repo.saveToolResult(result, tenantId);
    expect(saved.id).toBe('res-1');

    mockResults.push([
      {
        id: 'res-1',
        tenantId,
        toolRequestId: 'req-1',
        response: {},
        status: ToolStatusEnum.SUCCESS,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const got = await repo.getToolResultByRequestId('req-1', tenantId);
    expect(got?.id).toBe('res-1');

    // Get non-existent result
    mockResults.push([]);
    const gotNone = await repo.getToolResultByRequestId('other', tenantId);
    expect(gotNone).toBeNull();
  });

  it('should save, find, and get escalation', async () => {
    const escalation = new AiEscalation('esc-1', {
      tenantId,
      conversationId,
      reason: 'VIP',
      escalatedTo: EscalationTargetEnum.AGENT,
      status: EscalationStatusEnum.PENDING,
    });

    mockResults.push([{ id: 'esc-1' }]);
    const saved = await repo.saveEscalation(escalation, tenantId);
    expect(saved.id).toBe('esc-1');

    mockResults.push([
      {
        id: 'esc-1',
        tenantId,
        conversationId,
        reason: 'VIP',
        escalatedTo: EscalationTargetEnum.AGENT,
        status: EscalationStatusEnum.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const got = await repo.getEscalationById('esc-1', tenantId);
    expect(got?.id).toBe('esc-1');

    // Find escalations
    mockResults.push([
      {
        id: 'esc-1',
        tenantId,
        conversationId,
        reason: 'VIP',
        escalatedTo: EscalationTargetEnum.AGENT,
        status: EscalationStatusEnum.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const listed = await repo.findEscalations(tenantId, 'PENDING');
    expect(listed.length).toBe(1);

    // Get non-existent escalation
    mockResults.push([]);
    const gotNone = await repo.getEscalationById('other', tenantId);
    expect(gotNone).toBeNull();
  });

  it('should save, find, and get usage metric', async () => {
    const metric = new AiUsageMetric('usage-1', {
      tenantId,
      agentId,
      date: '2026-06-20',
      requests: 1,
      tokens: 10,
      cost: 0.01,
      workflowCount: 1,
      toolCalls: 1,
    });

    mockResults.push([{ agentId, date: '2026-06-20' }]);
    const saved = await repo.saveUsageMetric(metric, tenantId);
    expect(saved.id).toBe('usage-1');

    mockResults.push([
      {
        id: 'usage-1',
        tenantId,
        agentId,
        date: '2026-06-20',
        requests: 1,
        tokens: 10,
        cost: '0.01',
        workflowCount: 1,
        toolCalls: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const got = await repo.getUsageMetric(agentId, '2026-06-20', tenantId);
    expect(got?.id).toBe('usage-1');

    // Find usage metrics
    mockResults.push([
      {
        id: 'usage-1',
        tenantId,
        agentId,
        date: '2026-06-20',
        requests: 1,
        tokens: 10,
        cost: '0.01',
        workflowCount: 1,
        toolCalls: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const listed = await repo.findUsageMetrics(
      tenantId,
      agentId,
      '2026-06-01',
      '2026-06-30',
    );
    expect(listed.length).toBe(1);

    // Get non-existent usage metric
    mockResults.push([]);
    const gotNone = await repo.getUsageMetric('other', '2026-06-20', tenantId);
    expect(gotNone).toBeNull();
  });

  it('should log response log', async () => {
    mockResults.push([]);
    await expect(
      repo.logResponse(
        {
          id: 'log-1',
          conversationId,
          messageId: 'msg-1',
          workflowExecutionId: 'exec-1',
          responseType: 'AUTOMATED',
          responseTimeMs: 100,
          confidenceScore: 0.95,
          tokensUsed: 100,
          cost: 0.01,
        },
        tenantId,
      ),
    ).resolves.not.toThrow();
  });
});
