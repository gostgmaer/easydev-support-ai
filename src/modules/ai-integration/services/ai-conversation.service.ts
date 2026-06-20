import { Injectable, Inject } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiConversationSession } from '../domain/entities';
import { AIPlatformClient } from './ai-platform.client';
import * as crypto from 'crypto';

@Injectable()
export class AiConversationService {
  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
    private readonly aiClient: AIPlatformClient,
  ) {}

  public async getOrCreateSession(
    tenantId: string,
    conversationId: string,
    customerId: string,
    agentId: string,
  ): Promise<AiConversationSession> {
    let session = await this.repository.getSessionByConversationId(
      conversationId,
      tenantId,
    );
    if (!session) {
      const sessionId = crypto.randomUUID();
      session = new AiConversationSession(sessionId, {
        tenantId,
        conversationId,
        customerId,
        agentId,
        sessionState: {},
      });
      await this.repository.saveSession(session, tenantId);
    }
    return session;
  }

  public async updateSessionState(
    tenantId: string,
    conversationId: string,
    state: Record<string, any>,
  ): Promise<AiConversationSession> {
    const session = await this.repository.getSessionByConversationId(
      conversationId,
      tenantId,
    );
    if (!session) {
      throw new Error(`Session for conversation ${conversationId} not found`);
    }
    session.updateState(state);
    return this.repository.saveSession(session, tenantId);
  }

  public async associateWorkflow(
    tenantId: string,
    conversationId: string,
    workflowExecutionId: string,
  ): Promise<AiConversationSession> {
    const session = await this.repository.getSessionByConversationId(
      conversationId,
      tenantId,
    );
    if (!session) {
      throw new Error(`Session for conversation ${conversationId} not found`);
    }
    session.associateWorkflow(workflowExecutionId);
    return this.repository.saveSession(session, tenantId);
  }

  public async recallMemory(
    tenantId: string,
    query: string,
    key?: string,
  ): Promise<any> {
    return this.aiClient.recallMemory(tenantId, query, key);
  }

  public async getConversationContext(
    tenantId: string,
    conversationId: string,
  ): Promise<any> {
    return this.aiClient.getConversationContext(tenantId, conversationId);
  }
}
