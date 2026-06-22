import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConversationService } from '../../conversations/services/conversation.service';
import { MessageService } from '../../messages/services/message.service';
import { AiRoutingService } from './ai-routing.service';
import { AiConversationService } from './ai-conversation.service';
import { AiEscalationService } from './ai-escalation.service';
import { AiWorkflowService } from './ai-workflow.service';
import { AiUsageService } from './ai-usage.service';
import { AIPlatformClient } from './ai-platform.client';
import { KnowledgeSearchService } from '../../knowledge-base/services/knowledge-search.service';
import { KnowledgeChunkService } from '../../knowledge-base/services/knowledge-chunk.service';
import {
  MessageDirectionEnum,
  MessageTypeEnum,
} from '../../messages/domain/value-objects';
import { ResponseTypeEnum } from '../domain/value-objects';

const KNOWLEDGE_CONTEXT_DOC_LIMIT = 3;
const KNOWLEDGE_CONTEXT_EXCERPT_LENGTH = 800;

@Injectable()
export class AiResponseService {
  private readonly logger = new Logger(AiResponseService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly routingService: AiRoutingService,
    private readonly conversationServiceAi: AiConversationService,
    private readonly escalationService: AiEscalationService,
    private readonly workflowService: AiWorkflowService,
    private readonly usageService: AiUsageService,
    private readonly aiClient: AIPlatformClient,
    private readonly knowledgeSearchService: KnowledgeSearchService,
    private readonly knowledgeChunkService: KnowledgeChunkService,
  ) {}

  public async processInboundMessage(
    tenantId: string,
    messageId: string,
    conversationId: string,
    messageText: string,
  ): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `Processing inbound message ${messageId} in conversation ${conversationId}`,
    );

    // 1. Load Conversation
    const conversation = await this.conversationService.findById(
      tenantId,
      conversationId,
    );
    if (!conversation) {
      this.logger.warn(`Conversation ${conversationId} not found`);
      return;
    }

    // 2. Agent Resolution
    const agent = await this.routingService.selectAgent(tenantId, {
      language: conversation.language?.value || 'en',
    });

    if (!agent) {
      this.logger.warn(`No active AI Agent found for tenant ${tenantId}`);
      return;
    }

    // 3. Load/Create Conversation Session
    const session = await this.conversationServiceAi.getOrCreateSession(
      tenantId,
      conversationId,
      conversation.customerId,
      agent.id,
    );

    // 4. Run Escalation Checks on input message
    const escalated = await this.escalationService.evaluateEscalation(
      tenantId,
      conversationId,
      messageText,
      1.0, // base confidence
      0.0, // base sentiment
    );

    if (escalated) {
      this.logger.log(
        `Conversation ${conversationId} escalated to human. Bypassing AI generation.`,
      );
      return { escalated: true };
    }

    // 5. Select & Trigger Workflow
    const workflowId = this.routingService.selectWorkflow(agent);

    // Call AI Platform to generate / v1/generate
    try {
      const recallContext =
        await this.conversationServiceAi.getConversationContext(
          tenantId,
          conversationId,
        );

      // 5b. Knowledge Retrieval (RAG grounding)
      const knowledgeContext = await this.retrieveKnowledgeContext(
        tenantId,
        messageText,
      );

      const baseSystemPrompt =
        agent.systemPromptReference || 'You are an AI support agent.';
      const groundedSystemPrompt = knowledgeContext
        ? `${baseSystemPrompt}\n\nUse the following knowledge base articles to answer the customer's question if relevant. Ignore them if they don't apply:\n\n${knowledgeContext}`
        : baseSystemPrompt;

      const execution = await this.workflowService.triggerWorkflow(
        tenantId,
        workflowId,
        conversationId,
        {
          prompt: messageText,
          systemPrompt: groundedSystemPrompt,
          history: recallContext || [],
          configuration: agent.configuration,
        },
      );

      // Select /v1/generate or workflow result
      const generateResult = await this.aiClient.generate(
        tenantId,
        messageText,
        groundedSystemPrompt,
        agent.configuration || {},
      );

      const replyText =
        generateResult.text ||
        'I am sorry, I could not process your request at this time.';
      const confidence = generateResult.confidence || 0.9;
      const tokensUsed = generateResult.tokensUsed || 100;
      const cost = generateResult.cost || 0.002;

      // Mask sensitive data / PII protection (e.g. credit cards or emails)
      const maskedText = this.maskSensitiveData(replyText);

      // 6. Create Outbound Automated Response Message
      const outboundMessage = await this.messageService.create(tenantId, {
        conversationId,
        direction: MessageDirectionEnum.OUTBOUND,
        messageType: MessageTypeEnum.TEXT,
        content: maskedText,
        senderId: agent.id,
        senderType: 'AGENT',
      });

      // 7. Track logs and usage metrics
      const responseTime = Date.now() - startTime;
      await this.usageService.logResponse(
        tenantId,
        conversationId,
        outboundMessage.id,
        execution.id,
        ResponseTypeEnum.AUTOMATED,
        responseTime,
        confidence,
        tokensUsed,
        cost,
      );

      await this.usageService.recordUsage(
        tenantId,
        agent.id,
        tokensUsed,
        cost,
        true,
        0,
      );

      // Update session state
      await this.conversationServiceAi.updateSessionState(
        tenantId,
        conversationId,
        {
          lastResponseId: outboundMessage.id,
          workflowExecutionId: execution.id,
        },
      );

      return {
        escalated: false,
        messageId: outboundMessage.id,
        reply: maskedText,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed during AI auto-response generation: ${err.message}`,
      );
      // Fallback response or trigger manager escalation if repeated failure
      await this.escalationService.createEscalation(
        tenantId,
        conversationId,
        `AI Auto-response processing failed: ${err.message}`,
        0.0,
        -1.0,
      );
      throw err;
    }
  }

  /**
   * On-demand counterpart to processInboundMessage: an agent asks the AI for a
   * suggested reply instead of waiting for the auto-pipeline. Generates a draft
   * grounded the same way (knowledge retrieval + system prompt), but returns it
   * for the agent to review/edit/send rather than auto-posting it as a message.
   */
  public async generateDraftSuggestion(
    tenantId: string,
    conversationId: string,
  ): Promise<{ content: string; confidence: number; cost: number }> {
    const conversation = await this.conversationService.findById(
      tenantId,
      conversationId,
    );
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const agent = await this.routingService.selectAgent(tenantId, {
      language: conversation.language?.value || 'en',
    });
    if (!agent) {
      throw new NotFoundException(
        `No active AI Agent found for tenant ${tenantId}`,
      );
    }

    const latestMessages = await this.messageService.findByConversation(
      tenantId,
      conversationId,
      {
        sortOrder: 'DESC',
        limit: 1,
        direction: MessageDirectionEnum.INBOUND,
      } as any,
    );
    const promptText = latestMessages.data[0]?.content || '';

    const knowledgeContext = await this.retrieveKnowledgeContext(
      tenantId,
      promptText,
    );

    const baseSystemPrompt =
      agent.systemPromptReference || 'You are an AI support agent.';
    const groundedSystemPrompt = knowledgeContext
      ? `${baseSystemPrompt}\n\nUse the following knowledge base articles to answer the customer's question if relevant. Ignore them if they don't apply:\n\n${knowledgeContext}`
      : baseSystemPrompt;

    const generateResult = await this.aiClient.generate(
      tenantId,
      promptText,
      groundedSystemPrompt,
      agent.configuration || {},
    );

    const replyText =
      generateResult.text ||
      'I am sorry, I could not generate a suggestion at this time.';
    const confidence = generateResult.confidence || 0.9;
    const tokensUsed = generateResult.tokensUsed || 100;
    const cost = generateResult.cost || 0.002;
    const maskedText = this.maskSensitiveData(replyText);

    await this.usageService.logResponse(
      tenantId,
      conversationId,
      randomUUID(),
      undefined,
      ResponseTypeEnum.SUGGESTION,
      0,
      confidence,
      tokensUsed,
      cost,
    );
    await this.usageService.recordUsage(
      tenantId,
      agent.id,
      tokensUsed,
      cost,
      false,
      0,
    );

    return { content: maskedText, confidence, cost };
  }

  private async retrieveKnowledgeContext(
    tenantId: string,
    query: string,
  ): Promise<string> {
    try {
      const results = await this.knowledgeSearchService.search(tenantId, {
        query,
        limit: KNOWLEDGE_CONTEXT_DOC_LIMIT,
      });

      if (!results || results.length === 0) {
        return '';
      }

      const excerpts = await Promise.all(
        results
          .slice(0, KNOWLEDGE_CONTEXT_DOC_LIMIT)
          .map(async (result: any) => {
            const chunks = await this.knowledgeChunkService.getChunks(
              tenantId,
              result.document.id,
            );
            const content =
              chunks[0]?.content?.slice(0, KNOWLEDGE_CONTEXT_EXCERPT_LENGTH) ||
              '';
            if (!content) {
              return '';
            }
            return `[${result.document.title}]\n${content}`;
          }),
      );

      return excerpts.filter((excerpt) => excerpt.length > 0).join('\n\n');
    } catch (err: any) {
      this.logger.warn(`Knowledge retrieval failed: ${err.message}`);
      return '';
    }
  }

  private maskSensitiveData(text: string): string {
    // Mask emails
    let masked = text.replace(
      /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/gi,
      '[EMAIL_HIDDEN]',
    );
    // Mask 16-digit credit cards
    masked = masked.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD_HIDDEN]');
    return masked;
  }
}
