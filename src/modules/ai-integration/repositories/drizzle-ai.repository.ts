import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { IAiRepository } from './ai-repository.interface';
import { AiAgent } from '../domain/ai-agent.aggregate';
import {
  AiConversationSession,
  AiWorkflowExecution,
  AiToolRequest,
  AiToolResult,
  AiEscalation,
  AiUsageMetric,
} from '../domain/entities';
import { AiMapper } from './ai.mapper';

@Injectable()
export class DrizzleAiRepository implements IAiRepository {
  // ------------------ AiAgent ------------------
  public async saveAgent(agent: AiAgent, tenantId: string): Promise<AiAgent> {
    const rawAgent = {
      id: agent.id,
      tenantId: agent.tenantId,
      name: agent.name,
      description: agent.description || null,
      agentType: agent.agentType,
      status: agent.status,
      defaultWorkflow: agent.defaultWorkflow || null,
      systemPromptReference: agent.systemPromptReference || null,
      configuration: agent.configuration || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiAgents)
      .where(
        and(
          eq(schema.aiAgents.id, agent.id),
          eq(schema.aiAgents.tenantId, tenantId),
        ),
      );

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(schema.aiAgents)
          .set(rawAgent)
          .where(
            and(
              eq(schema.aiAgents.id, agent.id),
              eq(schema.aiAgents.tenantId, tenantId),
            ),
          );
      } else {
        await tx
          .insert(schema.aiAgents)
          .values({ ...rawAgent, createdAt: agent.createdAt });
      }

      // Handle Profile
      if (agent.profile) {
        const rawProfile = {
          id: agent.id, // 1-to-1 key
          tenantId: agent.tenantId,
          agentId: agent.id,
          knowledgeScope: agent.profile.knowledgeScope || null,
          connectorScope: agent.profile.connectorScope || null,
          languageSupport: agent.profile.languageSupport || null,
          escalationRules: agent.profile.escalationRules || null,
          configuration: agent.profile.configuration || null,
          updatedAt: new Date(),
        };

        const [existingProfile] = await tx
          .select()
          .from(schema.aiAgentProfiles)
          .where(
            and(
              eq(schema.aiAgentProfiles.agentId, agent.id),
              eq(schema.aiAgentProfiles.tenantId, tenantId),
            ),
          );

        if (existingProfile) {
          await tx
            .update(schema.aiAgentProfiles)
            .set(rawProfile)
            .where(
              and(
                eq(schema.aiAgentProfiles.agentId, agent.id),
                eq(schema.aiAgentProfiles.tenantId, tenantId),
              ),
            );
        } else {
          await tx
            .insert(schema.aiAgentProfiles)
            .values({ ...rawProfile, createdAt: agent.createdAt });
        }
      }

      // Handle Model Config
      if (agent.modelConfig) {
        const rawConfig = {
          id: agent.id, // 1-to-1 key
          tenantId: agent.tenantId,
          agentId: agent.id,
          modelName: agent.modelConfig.modelName,
          provider: agent.modelConfig.provider,
          temperature: agent.modelConfig.temperature,
          maxTokens: agent.modelConfig.maxTokens,
          topP: agent.modelConfig.topP,
          presencePenalty: agent.modelConfig.presencePenalty,
          frequencyPenalty: agent.modelConfig.frequencyPenalty,
          stopSequences: agent.modelConfig.stopSequences || null,
          updatedAt: new Date(),
        };

        const [existingConfig] = await tx
          .select()
          .from(schema.aiModelConfigurations)
          .where(
            and(
              eq(schema.aiModelConfigurations.agentId, agent.id),
              eq(schema.aiModelConfigurations.tenantId, tenantId),
            ),
          );

        if (existingConfig) {
          await tx
            .update(schema.aiModelConfigurations)
            .set(rawConfig)
            .where(
              and(
                eq(schema.aiModelConfigurations.agentId, agent.id),
                eq(schema.aiModelConfigurations.tenantId, tenantId),
              ),
            );
        } else {
          await tx
            .insert(schema.aiModelConfigurations)
            .values({ ...rawConfig, createdAt: agent.createdAt });
        }
      }
    });

    return agent;
  }

  public async getAgentById(
    id: string,
    tenantId: string,
  ): Promise<AiAgent | null> {
    const [raw] = await db
      .select()
      .from(schema.aiAgents)
      .where(
        and(eq(schema.aiAgents.id, id), eq(schema.aiAgents.tenantId, tenantId)),
      );

    if (!raw) return null;

    const [profile] = await db
      .select()
      .from(schema.aiAgentProfiles)
      .where(
        and(
          eq(schema.aiAgentProfiles.agentId, id),
          eq(schema.aiAgentProfiles.tenantId, tenantId),
        ),
      );

    const [modelConfig] = await db
      .select()
      .from(schema.aiModelConfigurations)
      .where(
        and(
          eq(schema.aiModelConfigurations.agentId, id),
          eq(schema.aiModelConfigurations.tenantId, tenantId),
        ),
      );

    return AiMapper.agentToDomain(raw, profile, modelConfig);
  }

  public async findAgents(tenantId: string, options?: any): Promise<AiAgent[]> {
    const rows = await db
      .select()
      .from(schema.aiAgents)
      .where(and(eq(schema.aiAgents.tenantId, tenantId)));

    const agents: AiAgent[] = [];
    for (const row of rows) {
      const [profile] = await db
        .select()
        .from(schema.aiAgentProfiles)
        .where(
          and(
            eq(schema.aiAgentProfiles.agentId, row.id),
            eq(schema.aiAgentProfiles.tenantId, tenantId),
          ),
        );

      const [modelConfig] = await db
        .select()
        .from(schema.aiModelConfigurations)
        .where(
          and(
            eq(schema.aiModelConfigurations.agentId, row.id),
            eq(schema.aiModelConfigurations.tenantId, tenantId),
          ),
        );

      agents.push(AiMapper.agentToDomain(row, profile, modelConfig));
    }

    return agents;
  }

  public async deleteAgent(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.aiAgents)
      .where(
        and(eq(schema.aiAgents.id, id), eq(schema.aiAgents.tenantId, tenantId)),
      );

    if (!existing) return false;

    await db
      .delete(schema.aiAgents)
      .where(
        and(eq(schema.aiAgents.id, id), eq(schema.aiAgents.tenantId, tenantId)),
      );

    return true;
  }

  // ------------------ AiConversationSession ------------------
  public async saveSession(
    session: AiConversationSession,
    tenantId: string,
  ): Promise<AiConversationSession> {
    const raw = {
      id: session.id,
      tenantId: session.tenantId,
      conversationId: session.conversationId,
      customerId: session.customerId,
      agentId: session.agentId,
      workflowExecutionId: session.workflowExecutionId || null,
      sessionState: session.sessionState,
      lastInteractionAt: session.lastInteractionAt || null,
      contextVersion: session.contextVersion,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiConversationSessions)
      .where(
        and(
          eq(schema.aiConversationSessions.id, session.id),
          eq(schema.aiConversationSessions.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.aiConversationSessions)
        .set(raw)
        .where(
          and(
            eq(schema.aiConversationSessions.id, session.id),
            eq(schema.aiConversationSessions.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.aiConversationSessions)
        .values({ ...raw, createdAt: session.createdAt });
    }

    return session;
  }

  public async getSessionByConversationId(
    conversationId: string,
    tenantId: string,
  ): Promise<AiConversationSession | null> {
    const [row] = await db
      .select()
      .from(schema.aiConversationSessions)
      .where(
        and(
          eq(schema.aiConversationSessions.conversationId, conversationId),
          eq(schema.aiConversationSessions.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return AiMapper.sessionToDomain(row);
  }

  // ------------------ AiWorkflowExecution ------------------
  public async saveWorkflowExecution(
    execution: AiWorkflowExecution,
    tenantId: string,
  ): Promise<AiWorkflowExecution> {
    const raw = {
      id: execution.id,
      tenantId: execution.tenantId,
      workflowId: execution.workflowId,
      conversationId: execution.conversationId,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt || null,
      executionTimeMs: execution.executionTimeMs,
      tokensUsed: execution.tokensUsed,
      estimatedCost: execution.estimatedCost,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiWorkflowExecutions)
      .where(
        and(
          eq(schema.aiWorkflowExecutions.id, execution.id),
          eq(schema.aiWorkflowExecutions.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.aiWorkflowExecutions)
        .set(raw)
        .where(
          and(
            eq(schema.aiWorkflowExecutions.id, execution.id),
            eq(schema.aiWorkflowExecutions.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.aiWorkflowExecutions)
        .values({ ...raw, createdAt: execution.createdAt });
    }

    return execution;
  }

  public async getWorkflowExecutionById(
    id: string,
    tenantId: string,
  ): Promise<AiWorkflowExecution | null> {
    const [row] = await db
      .select()
      .from(schema.aiWorkflowExecutions)
      .where(
        and(
          eq(schema.aiWorkflowExecutions.id, id),
          eq(schema.aiWorkflowExecutions.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return AiMapper.workflowToDomain(row);
  }

  // ------------------ AiToolRequest ------------------
  public async saveToolRequest(
    request: AiToolRequest,
    tenantId: string,
  ): Promise<AiToolRequest> {
    const raw = {
      id: request.id,
      tenantId: request.tenantId,
      workflowExecutionId: request.workflowExecutionId,
      toolName: request.toolName,
      capability: request.capability,
      payload: request.payload,
      status: request.status,
      requestedAt: request.requestedAt,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiToolRequests)
      .where(
        and(
          eq(schema.aiToolRequests.id, request.id),
          eq(schema.aiToolRequests.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.aiToolRequests)
        .set(raw)
        .where(
          and(
            eq(schema.aiToolRequests.id, request.id),
            eq(schema.aiToolRequests.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.aiToolRequests)
        .values({ ...raw, createdAt: request.createdAt });
    }

    return request;
  }

  public async getToolRequestById(
    id: string,
    tenantId: string,
  ): Promise<AiToolRequest | null> {
    const [row] = await db
      .select()
      .from(schema.aiToolRequests)
      .where(
        and(
          eq(schema.aiToolRequests.id, id),
          eq(schema.aiToolRequests.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return AiMapper.toolRequestToDomain(row);
  }

  // ------------------ AiToolResult ------------------
  public async saveToolResult(
    result: AiToolResult,
    tenantId: string,
  ): Promise<AiToolResult> {
    const raw = {
      id: result.id,
      tenantId: result.tenantId,
      toolRequestId: result.toolRequestId,
      response: result.response,
      status: result.status,
      completedAt: result.completedAt,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiToolResults)
      .where(
        and(
          eq(schema.aiToolResults.id, result.id),
          eq(schema.aiToolResults.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.aiToolResults)
        .set(raw)
        .where(
          and(
            eq(schema.aiToolResults.id, result.id),
            eq(schema.aiToolResults.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.aiToolResults)
        .values({ ...raw, createdAt: result.createdAt });
    }

    return result;
  }

  public async getToolResultByRequestId(
    requestId: string,
    tenantId: string,
  ): Promise<AiToolResult | null> {
    const [row] = await db
      .select()
      .from(schema.aiToolResults)
      .where(
        and(
          eq(schema.aiToolResults.toolRequestId, requestId),
          eq(schema.aiToolResults.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return AiMapper.toolResultToDomain(row);
  }

  // ------------------ AiEscalation ------------------
  public async saveEscalation(
    escalation: AiEscalation,
    tenantId: string,
  ): Promise<AiEscalation> {
    const raw = {
      id: escalation.id,
      tenantId: escalation.tenantId,
      conversationId: escalation.conversationId,
      reason: escalation.reason,
      confidenceScore: escalation.confidenceScore || null,
      sentimentScore: escalation.sentimentScore || null,
      escalatedTo: escalation.escalatedTo,
      status: escalation.status,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiEscalations)
      .where(
        and(
          eq(schema.aiEscalations.id, escalation.id),
          eq(schema.aiEscalations.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.aiEscalations)
        .set(raw)
        .where(
          and(
            eq(schema.aiEscalations.id, escalation.id),
            eq(schema.aiEscalations.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.aiEscalations)
        .values({ ...raw, createdAt: escalation.createdAt });
    }

    return escalation;
  }

  public async getEscalationById(
    id: string,
    tenantId: string,
  ): Promise<AiEscalation | null> {
    const [row] = await db
      .select()
      .from(schema.aiEscalations)
      .where(
        and(
          eq(schema.aiEscalations.id, id),
          eq(schema.aiEscalations.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return AiMapper.escalationToDomain(row);
  }

  public async findEscalations(
    tenantId: string,
    status?: string,
  ): Promise<AiEscalation[]> {
    const conditions = [eq(schema.aiEscalations.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(schema.aiEscalations.status, status));
    }

    const rows = await db
      .select()
      .from(schema.aiEscalations)
      .where(and(...conditions))
      .orderBy(desc(schema.aiEscalations.createdAt));

    return rows.map((r) => AiMapper.escalationToDomain(r));
  }

  // ------------------ AiUsageMetric ------------------
  public async saveUsageMetric(
    metric: AiUsageMetric,
    tenantId: string,
  ): Promise<AiUsageMetric> {
    const raw = {
      id: metric.id,
      tenantId: metric.tenantId,
      agentId: metric.agentId,
      date: metric.date,
      requests: metric.requests,
      tokens: metric.tokens,
      cost: metric.cost,
      workflowCount: metric.workflowCount,
      toolCalls: metric.toolCalls,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.aiUsageMetrics)
      .where(
        and(
          eq(schema.aiUsageMetrics.agentId, metric.agentId),
          eq(schema.aiUsageMetrics.date, metric.date),
          eq(schema.aiUsageMetrics.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.aiUsageMetrics)
        .set(raw)
        .where(
          and(
            eq(schema.aiUsageMetrics.agentId, metric.agentId),
            eq(schema.aiUsageMetrics.date, metric.date),
            eq(schema.aiUsageMetrics.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.aiUsageMetrics)
        .values({ ...raw, createdAt: metric.createdAt });
    }

    return metric;
  }

  public async getUsageMetric(
    agentId: string,
    date: string,
    tenantId: string,
  ): Promise<AiUsageMetric | null> {
    const [row] = await db
      .select()
      .from(schema.aiUsageMetrics)
      .where(
        and(
          eq(schema.aiUsageMetrics.agentId, agentId),
          eq(schema.aiUsageMetrics.date, date),
          eq(schema.aiUsageMetrics.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return AiMapper.usageToDomain(row);
  }

  public async findUsageMetrics(
    tenantId: string,
    agentId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AiUsageMetric[]> {
    const conditions = [eq(schema.aiUsageMetrics.tenantId, tenantId)];
    if (agentId) {
      conditions.push(eq(schema.aiUsageMetrics.agentId, agentId));
    }
    if (startDate) {
      conditions.push(gte(schema.aiUsageMetrics.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.aiUsageMetrics.date, endDate));
    }

    const rows = await db
      .select()
      .from(schema.aiUsageMetrics)
      .where(and(...conditions))
      .orderBy(asc(schema.aiUsageMetrics.date));

    return rows.map((r) => AiMapper.usageToDomain(r));
  }

  // ------------------ Logs ------------------
  public async logResponse(
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
  ): Promise<void> {
    await db.insert(schema.aiResponseLogs).values({
      id: log.id,
      tenantId,
      conversationId: log.conversationId,
      messageId: log.messageId,
      workflowExecutionId: log.workflowExecutionId || null,
      responseType: log.responseType,
      responseTimeMs: log.responseTimeMs,
      confidenceScore: log.confidenceScore || null,
      tokensUsed: log.tokensUsed,
      cost: log.cost,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
