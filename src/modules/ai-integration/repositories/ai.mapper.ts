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
  WorkflowStatusEnum,
  ToolStatusEnum,
  EscalationStatusEnum,
  EscalationTargetEnum,
} from '../domain/value-objects';

export class AiMapper {
  public static agentToDomain(
    raw: any,
    profile?: any,
    modelConfig?: any,
  ): AiAgent {
    return new AiAgent(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      description: raw.description || undefined,
      agentType: raw.agentType as AgentTypeEnum,
      status: raw.status as AgentStatusEnum,
      defaultWorkflow: raw.defaultWorkflow || undefined,
      systemPromptReference: raw.systemPromptReference || undefined,
      configuration: raw.configuration || undefined,
      profile: profile
        ? {
            knowledgeScope: profile.knowledgeScope || undefined,
            connectorScope: profile.connectorScope || undefined,
            languageSupport: profile.languageSupport || undefined,
            escalationRules: profile.escalationRules || undefined,
            configuration: profile.configuration || undefined,
          }
        : undefined,
      modelConfig: modelConfig
        ? {
            modelName: modelConfig.modelName,
            provider: modelConfig.provider,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            topP: modelConfig.topP,
            presencePenalty: modelConfig.presencePenalty,
            frequencyPenalty: modelConfig.frequencyPenalty,
            stopSequences: modelConfig.stopSequences || undefined,
          }
        : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static sessionToDomain(raw: any): AiConversationSession {
    return new AiConversationSession(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      customerId: raw.customerId,
      agentId: raw.agentId,
      workflowExecutionId: raw.workflowExecutionId || undefined,
      sessionState: raw.sessionState || {},
      lastInteractionAt: raw.lastInteractionAt
        ? new Date(raw.lastInteractionAt)
        : undefined,
      contextVersion: raw.contextVersion,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static workflowToDomain(raw: any): AiWorkflowExecution {
    return new AiWorkflowExecution(raw.id, {
      tenantId: raw.tenantId,
      workflowId: raw.workflowId,
      conversationId: raw.conversationId,
      status: raw.status as WorkflowStatusEnum,
      startedAt: raw.startedAt ? new Date(raw.startedAt) : undefined,
      completedAt: raw.completedAt ? new Date(raw.completedAt) : undefined,
      executionTimeMs: raw.executionTimeMs,
      tokensUsed: raw.tokensUsed,
      estimatedCost: parseFloat(raw.estimatedCost || '0'),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static toolRequestToDomain(raw: any): AiToolRequest {
    return new AiToolRequest(raw.id, {
      tenantId: raw.tenantId,
      workflowExecutionId: raw.workflowExecutionId,
      toolName: raw.toolName,
      capability: raw.capability,
      payload: raw.payload || {},
      status: raw.status as ToolStatusEnum,
      requestedAt: raw.requestedAt ? new Date(raw.requestedAt) : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static toolResultToDomain(raw: any): AiToolResult {
    return new AiToolResult(raw.id, {
      tenantId: raw.tenantId,
      toolRequestId: raw.toolRequestId,
      response: raw.response || {},
      status: raw.status as ToolStatusEnum,
      completedAt: raw.completedAt ? new Date(raw.completedAt) : undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static escalationToDomain(raw: any): AiEscalation {
    return new AiEscalation(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      reason: raw.reason,
      confidenceScore:
        raw.confidenceScore !== null
          ? parseFloat(raw.confidenceScore)
          : undefined,
      sentimentScore:
        raw.sentimentScore !== null
          ? parseFloat(raw.sentimentScore)
          : undefined,
      escalatedTo: raw.escalatedTo as EscalationTargetEnum,
      status: raw.status as EscalationStatusEnum,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static usageToDomain(raw: any): AiUsageMetric {
    return new AiUsageMetric(raw.id, {
      tenantId: raw.tenantId,
      agentId: raw.agentId,
      date: raw.date,
      requests: raw.requests,
      tokens: raw.tokens,
      cost: parseFloat(raw.cost || '0'),
      workflowCount: raw.workflowCount,
      toolCalls: raw.toolCalls,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }
}
