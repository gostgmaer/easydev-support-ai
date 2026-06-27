import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { KnowledgePermissionService } from '../../knowledge-base/services/knowledge-permission.service';
import { InboxService } from '../../inbox/services/inbox.service';
import { MessageDraftService } from '../../messages/services/message-draft.service';
import { AiSettingsService } from '../../settings/services/ai-settings.service';
import { UsageLimitService } from '../../settings/services/usage-limit.service';
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
    private readonly knowledgePermissionService: KnowledgePermissionService,
    private readonly inboxService: InboxService,
    private readonly draftService: MessageDraftService,
    private readonly aiSettingsService: AiSettingsService,
    private readonly usageLimitService: UsageLimitService,
  ) {}

  public async processInboundMessage(
    tenantId: string,
    messageId: string,
    conversationId: string,
    messageText: string,
    isLastAttempt: boolean,
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

    // A human agent taking over (or pausing the AI) must actually stop the
    // AI from posting further replies - this check is the enforcement point
    // for InboxService.takeOverFromAi/setAiPaused, which otherwise only
    // update a read-model projection nothing else looks at.
    if (!(await this.inboxService.isAiActive(tenantId, conversationId))) {
      this.logger.log(
        `AI is paused/handed-off for conversation ${conversationId}; skipping auto-response.`,
      );
      return { escalated: false, aiPaused: true };
    }

    // confidenceThreshold/escalationThreshold/autoResponseEnabled/
    // autoEscalationEnabled were all fully modeled in AiSettings (entity,
    // DTO, repository) but never read anywhere outside the settings module
    // itself - tenants configuring them had no actual effect.
    const aiSettings = await this.aiSettingsService.getAiSettings(tenantId);
    if (!aiSettings.autoResponseEnabled) {
      this.logger.log(
        `Auto-response disabled for tenant ${tenantId}; skipping AI auto-response for conversation ${conversationId}.`,
      );
      return { escalated: false, autoResponseDisabled: true };
    }

    // UsageLimits.maxAiRequests was a plan ceiling nothing ever enforced.
    // A blocked AI call must hand the conversation to a human rather than
    // leaving it in silence - and must not throw here, since this method is
    // invoked from a retrying BullMQ job and quota exhaustion won't resolve
    // itself on retry.
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyUsage = await this.usageService.getUsageMetrics(
      tenantId,
      undefined,
      monthStart.toISOString().slice(0, 10),
    );
    const requestsThisMonth = monthlyUsage.reduce(
      (sum, m) => sum + m.requests,
      0,
    );
    try {
      await this.usageLimitService.enforceLimit(
        tenantId,
        'aiRequests',
        requestsThisMonth,
      );
    } catch {
      this.logger.warn(
        `Tenant ${tenantId} has exceeded its monthly AI request quota; escalating conversation ${conversationId} to a human instead of auto-responding.`,
      );
      await this.escalationService.createEscalation(
        tenantId,
        conversationId,
        'Monthly AI request quota exceeded',
        0.0,
        0.0,
      );
      return { escalated: true, reason: 'ai_quota_exceeded' };
    }

    // 2. Agent Resolution
    const agent = await this.routingService.selectAgent(tenantId, {
      language: conversation.language?.value || 'en',
    });

    if (!agent) {
      this.logger.warn(`No active AI Agent found for tenant ${tenantId}`);
      // Previously returned silently - the customer's message was processed
      // but generated no response and no signal anywhere that anything was
      // wrong. A misconfigured tenant (no AI agent set up yet) should still
      // get a human looking at the conversation.
      await this.escalationService.createEscalation(
        tenantId,
        conversationId,
        'No active AI agent configured for this tenant',
        0.0,
        0.0,
      );
      return { escalated: true, reason: 'no_ai_agent_configured' };
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
        generateResult.content ||
        'I am sorry, I could not process your request at this time.';
      // Heuristic fallback for AI confidence score if not provided in metadata
      let confidence = 0.9;
      if (generateResult.metadata?.confidence !== undefined) {
        confidence = Number(generateResult.metadata.confidence);
      } else if (replyText) {
        const uncertaintyKeywords = [
          'sorry',
          'not sure',
          'unable to',
          'do not know',
          'cannot confirm',
          'human agent',
          'reach out to support',
          'cannot answer',
          'dont know',
        ];
        let uncertaintyCount = 0;
        const lowerReply = replyText.toLowerCase();
        for (const kw of uncertaintyKeywords) {
          if (lowerReply.includes(kw)) {
            uncertaintyCount += 1;
          }
        }
        if (uncertaintyCount > 0) {
          confidence = Math.max(0.3, 0.9 - uncertaintyCount * 0.2);
        }
      }
      const tokensUsed = 100;
      const cost = 0.002;

      // Confidence was computed and logged but never compared against
      // anything - a low-confidence/hallucination-risk reply went straight
      // to the customer exactly like a fully-confident one.
      if (
        aiSettings.autoEscalationEnabled &&
        confidence < aiSettings.escalationThreshold
      ) {
        this.logger.log(
          `AI response confidence ${confidence} below escalation threshold ${aiSettings.escalationThreshold} for conversation ${conversationId}; escalating instead of auto-sending.`,
        );
        await this.escalationService.createEscalation(
          tenantId,
          conversationId,
          `AI response confidence (${confidence}) below escalation threshold (${aiSettings.escalationThreshold})`,
          confidence,
          0.0,
        );
        return { escalated: true, confidence };
      }

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

      // Only act on the terminal attempt - this method re-throws below, and
      // BullMQ retries 'ai-process-message' (DEFAULT_JOB_OPTIONS, 3 attempts
      // with exponential backoff). Creating the escalation / posting a
      // customer-facing message on every attempt would create duplicate
      // escalation records and show the customer the same "we're having
      // trouble" message up to 3 times for one underlying failure.
      if (isLastAttempt) {
        await this.escalationService.createEscalation(
          tenantId,
          conversationId,
          `AI Auto-response processing failed: ${err.message}`,
          0.0,
          -1.0,
        );

        // Previously the customer got no message at all on AI failure - the
        // escalation was purely internal. A human will see it via the
        // escalation queue, but the customer was left staring at silence.
        try {
          await this.messageService.create(tenantId, {
            conversationId,
            direction: MessageDirectionEnum.OUTBOUND,
            messageType: MessageTypeEnum.TEXT,
            content:
              "We're having trouble processing your message right now. A member of our support team will follow up with you shortly.",
            senderId: agent.id,
            senderType: 'AGENT',
          });
        } catch (notifyErr: any) {
          this.logger.error(
            `Failed to post AI-failure fallback message for conversation ${conversationId}: ${notifyErr.message}`,
          );
        }
      }

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
    authorId: string,
  ): Promise<{
    draftId: string;
    content: string;
    confidence: number;
    cost: number;
  }> {
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
      generateResult.content ||
      'I am sorry, I could not generate a suggestion at this time.';
    // Heuristic fallback for AI confidence score if not provided in metadata
    let confidence = 0.9;
    if (generateResult.metadata?.confidence !== undefined) {
      confidence = Number(generateResult.metadata.confidence);
    } else if (replyText) {
      const uncertaintyKeywords = [
        'sorry',
        'not sure',
        'unable to',
        'do not know',
        'cannot confirm',
        'human agent',
        'reach out to support',
        'cannot answer',
        'dont know',
      ];
      let uncertaintyCount = 0;
      const lowerReply = replyText.toLowerCase();
      for (const kw of uncertaintyKeywords) {
        if (lowerReply.includes(kw)) {
          uncertaintyCount += 1;
        }
      }
      if (uncertaintyCount > 0) {
        confidence = Math.max(0.3, 0.9 - uncertaintyCount * 0.2);
      }
    }
    const tokensUsed = 100;
    const cost = 0.002;
    const maskedText = this.maskSensitiveData(replyText);

    // Previously this returned content with no persisted draft behind it -
    // there was nothing for the agent to later accept/reject. Saving it as a
    // real MessageDraft gives InboxService.decideAiDraft something to send
    // or discard.
    const draft = await this.draftService.save(tenantId, authorId, {
      conversationId,
      draftContent: maskedText,
      draftType: 'TEXT',
    });

    await this.usageService.logResponse(
      tenantId,
      conversationId,
      draft.id,
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

    return { draftId: draft.id, content: maskedText, confidence, cost };
  }

  private async retrieveKnowledgeContext(
    tenantId: string,
    query: string,
  ): Promise<string> {
    try {
      // Over-fetch candidates: AI has no team/role identity, so
      // checkAccess(tenantId, documentId) below - called with neither -
      // naturally resolves to "only documents with no restrictive
      // KnowledgePermission rows, or explicitly public ones" (its existing,
      // already-correct semantics for an identity-less caller). Some
      // candidates may get filtered out, so fetch extra headroom rather than
      // searching for exactly the final count and losing context whenever a
      // tenant uses document permissions.
      const results = await this.knowledgeSearchService.search(tenantId, {
        query,
        limit: KNOWLEDGE_CONTEXT_DOC_LIMIT * 3,
      });

      if (!results || results.length === 0) {
        return '';
      }

      const permitted: any[] = [];
      for (const result of results) {
        if (permitted.length >= KNOWLEDGE_CONTEXT_DOC_LIMIT) break;
        const hasAccess = await this.knowledgePermissionService.checkAccess(
          tenantId,
          result.document.id,
        );
        if (hasAccess) {
          permitted.push(result);
        }
      }

      const excerpts = await Promise.all(
        permitted.map(async (result: any) => {
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
