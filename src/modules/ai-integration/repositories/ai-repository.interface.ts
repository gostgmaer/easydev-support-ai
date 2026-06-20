import { AiAgent } from '../domain/ai-agent.aggregate';
import {
  AiConversationSession,
  AiWorkflowExecution,
  AiToolRequest,
  AiToolResult,
  AiEscalation,
  AiUsageMetric,
} from '../domain/entities';

export interface IAiRepository {
  saveAgent(agent: AiAgent, tenantId: string): Promise<AiAgent>;
  getAgentById(id: string, tenantId: string): Promise<AiAgent | null>;
  findAgents(tenantId: string, options?: any): Promise<AiAgent[]>;
  deleteAgent(id: string, tenantId: string): Promise<boolean>;

  saveSession(
    session: AiConversationSession,
    tenantId: string,
  ): Promise<AiConversationSession>;
  getSessionByConversationId(
    conversationId: string,
    tenantId: string,
  ): Promise<AiConversationSession | null>;

  saveWorkflowExecution(
    execution: AiWorkflowExecution,
    tenantId: string,
  ): Promise<AiWorkflowExecution>;
  getWorkflowExecutionById(
    id: string,
    tenantId: string,
  ): Promise<AiWorkflowExecution | null>;

  saveToolRequest(
    request: AiToolRequest,
    tenantId: string,
  ): Promise<AiToolRequest>;
  getToolRequestById(
    id: string,
    tenantId: string,
  ): Promise<AiToolRequest | null>;

  saveToolResult(result: AiToolResult, tenantId: string): Promise<AiToolResult>;
  getToolResultByRequestId(
    requestId: string,
    tenantId: string,
  ): Promise<AiToolResult | null>;

  saveEscalation(
    escalation: AiEscalation,
    tenantId: string,
  ): Promise<AiEscalation>;
  getEscalationById(id: string, tenantId: string): Promise<AiEscalation | null>;
  findEscalations(tenantId: string, status?: string): Promise<AiEscalation[]>;

  saveUsageMetric(
    metric: AiUsageMetric,
    tenantId: string,
  ): Promise<AiUsageMetric>;
  getUsageMetric(
    agentId: string,
    date: string,
    tenantId: string,
  ): Promise<AiUsageMetric | null>;
  findUsageMetrics(
    tenantId: string,
    agentId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AiUsageMetric[]>;

  logResponse(
    log: {
      id: string;
      conversationId: string;
      messageId: string;
      workflowExecutionId?: string;
      responseType: string;
      responseTimeMs: number;
      confidenceScore?: number;
      tokensUsed: number;
      cost: number;
    },
    tenantId: string,
  ): Promise<void>;
}
