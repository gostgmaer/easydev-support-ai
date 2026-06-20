import { Injectable, Logger } from '@nestjs/common';
import { ConversationService } from '../../conversations/services/conversation.service';
import { MessageService } from '../../messages/services/message.service';
import { AiRoutingService } from './ai-routing.service';
import { AiConversationService } from './ai-conversation.service';
import { AiEscalationService } from './ai-escalation.service';
import { AiWorkflowService } from './ai-workflow.service';
import { AiUsageService } from './ai-usage.service';
import { AIPlatformClient } from './ai-platform.client';
import { MessageDirectionEnum, MessageTypeEnum } from '../../messages/domain/value-objects';
import { ResponseTypeEnum } from '../domain/value-objects';

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
  ) {}

  public async processInboundMessage(
    tenantId: string,
    messageId: string,
    conversationId: string,
    messageText: string,
  ): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`Processing inbound message ${messageId} in conversation ${conversationId}`);

    // 1. Load Conversation
    const conversation = await this.conversationService.findById(tenantId, conversationId);
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
      this.logger.log(`Conversation ${conversationId} escalated to human. Bypassing AI generation.`);
      return { escalated: true };
    }

    // 5. Select & Trigger Workflow
    const workflowId = this.routingService.selectWorkflow(agent);
    
    // Call AI Platform to generate / v1/generate
    try {
      const recallContext = await this.conversationServiceAi.getConversationContext(tenantId, conversationId);
      
      const execution = await this.workflowService.triggerWorkflow(tenantId, workflowId, conversationId, {
        prompt: messageText,
        systemPrompt: agent.systemPromptReference || 'You are an AI support agent.',
        history: recallContext || [],
        configuration: agent.configuration,
      });

      // Select /v1/generate or workflow result
      const generateResult = await this.aiClient.generate(tenantId, messageText, agent.systemPromptReference || '', agent.configuration || {});
      
      const replyText = generateResult.text || 'I am sorry, I could not process your request at this time.';
      const confidence = generateResult.confidence || 0.9;
      const tokensUsed = generateResult.tokensUsed || 100;
      const cost = generateResult.cost || 0.002;

      // Mask sensitive data / PII protection (e.g. credit cards or emails)
      const maskedText = this.maskSensitiveData(replyText);

      // 6. Create Outbound Automated Response Message
      const outboundMessage = await this.messageService.create(
        tenantId,
        {
          conversationId,
          direction: MessageDirectionEnum.OUTBOUND,
          messageType: MessageTypeEnum.TEXT,
          content: maskedText,
          senderId: agent.id,
          senderType: 'AGENT',
        },
      );

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

      await this.usageService.recordUsage(tenantId, agent.id, tokensUsed, cost, true, 0);

      // Update session state
      await this.conversationServiceAi.updateSessionState(tenantId, conversationId, {
        lastResponseId: outboundMessage.id,
        workflowExecutionId: execution.id,
      });

      return {
        escalated: false,
        messageId: outboundMessage.id,
        reply: maskedText,
      };
    } catch (err: any) {
      this.logger.error(`Failed during AI auto-response generation: ${err.message}`);
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

  private maskSensitiveData(text: string): string {
    // Mask emails
    let masked = text.replace(/([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/gi, '[EMAIL_HIDDEN]');
    // Mask 16-digit credit cards
    masked = masked.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD_HIDDEN]');
    return masked;
  }
}
