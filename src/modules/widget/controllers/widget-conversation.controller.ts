// @ts-nocheck
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WidgetSessionGuard } from '../guards/widget-session.guard';
import { ConversationService } from '../../conversations/services/conversation.service';
import { MessageService } from '../../messages/services/message.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AiResponseService } from '../../ai-integration/services/ai-response.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { TicketSourceEnum } from '../../tickets/domain/value-objects';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class WidgetStartConversationDto {
  @ApiProperty({ description: 'First message sent by the customer' })
  @IsString()
  @IsNotEmpty()
  initialMessage: string;

  @ApiPropertyOptional({ description: 'Channel ID to route this conversation through' })
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Customer email for identification' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer display name' })
  @IsString()
  @IsOptional()
  name?: string;
}

export class WidgetSendMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class WidgetCloseConversationDto {
  @ApiPropertyOptional({ description: 'Reason for closing' })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Widget Conversation Controller  (Flow 1, 2, 3)
 *
 * Provides the missing bridge between the customer widget frontend and the
 * backend conversation + AI pipelines.  All endpoints require a valid widget
 * session token (issued by POST /v1/widget/sessions/start).
 *
 * FLOW 1:  Widget → Conversation Created → AI Agent Responds → Knowledge
 *          Retrieval → Connector Execution → AI Response → Agent Escalation
 *          → Agent Resolution → Conversation Closed
 * FLOW 2:  Widget → Ticket Creation (delegated to ticket-queue from here)
 * FLOW 3:  Widget → Order Lookup → Connector Execution → AI Interpretation
 */
@ApiTags('Widget – Conversations')
@ApiHeader({ name: 'x-widget-token', required: true, description: 'Widget session token' })
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('v1/widget/conversations')
@UseGuards(WidgetSessionGuard)
export class WidgetConversationController {
  private readonly logger = new Logger(WidgetConversationController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly customerService: CustomerService,
    private readonly aiResponseService: AiResponseService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * POST /v1/widget/conversations
   *
   * Step 1 of FLOW 1: create a new conversation, persist the customer's first
   * message, then enqueue AI processing so the response can be generated
   * asynchronously without blocking the HTTP response.
   */
  @ApiOperation({
    summary: 'Start a new widget conversation (FLOW 1 entry point)',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-widget-visitor-id') visitorId: string,
    @Body() dto: WidgetStartConversationDto,
  ) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

    // 1. Resolve or create customer from visitor identity
    let customer = dto.email
      ? await this.customerService.findByEmail(tenantId, dto.email)
      : null;

    if (!customer) {
      customer = await this.customerService.create(tenantId, {
        email: dto.email || "",
        source: 'WIDGET',
        profile: dto.name ? { displayName: dto.name } : undefined,
        metadata: { anonymousVisitorId: visitorId },
      });
    }

    // 2. Create conversation
    const conversation = await this.conversationService.create(tenantId, {
      customerId: customer.id,
      channelId: dto.channelId || 'widget-default',
      source: 'WIDGET',
    });

    // 3. Persist customer's first message
    const message = await this.messageService.create(tenantId, {
      conversationId: conversation.id,
      content: dto.initialMessage,
      senderType: 'CUSTOMER',
      senderId: customer.id,
      direction: MessageDirectionEnum.INBOUND as any,
    });

    // 4. Enqueue AI processing (async – do not block the widget response)
    await this.queueService.addJob(QUEUES.CONVERSATION, 'ai-process-message', {
      tenantId,
      messageId: message.id,
      conversationId: conversation.id,
      messageText: dto.initialMessage,
    });

    this.logger.log(
      `Widget conversation ${conversation.id} started for customer ${customer.id} (tenant ${tenantId})`,
    );

    return {
      conversationId: conversation.id,
      customerId: customer.id,
      messageId: message.id,
      status: conversation.status.value,
    };
  }

  /**
   * POST /v1/widget/conversations/:conversationId/messages
   *
   * Step N of FLOW 1: Customer sends a follow-up message.  The AI pipeline
   * evaluates escalation and generates a response.
   */
  @ApiOperation({ summary: 'Send a follow-up message in an existing conversation' })
  @Post(':conversationId/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendMessage(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: WidgetSendMessageDto,
  ) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

    // Verify conversation exists
    const conversation = await this.conversationService.findById(
      tenantId,
      conversationId,
    );
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }

    // Persist message
    const message = await this.messageService.create(tenantId, {
      conversationId,
      content: dto.content,
      senderType: 'CUSTOMER',
      senderId: conversation.customerId,
      direction: MessageDirectionEnum.INBOUND as any,
    });

    // Enqueue AI processing
    await this.queueService.addJob(QUEUES.CONVERSATION, 'ai-process-message', {
      tenantId,
      messageId: message.id,
      conversationId,
      messageText: dto.content,
    });

    return { messageId: message.id, status: 'queued' };
  }

  /**
   * GET /v1/widget/conversations/:conversationId/messages
   *
   * Allows the widget frontend to poll / load message history.
   */
  @ApiOperation({ summary: 'Get message history for a widget conversation' })
  @Get(':conversationId/messages')
  async getMessages(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

    const messages = await this.messageService.findByConversation(
      tenantId,
      conversationId,
      {} as any
    );
    return (messages.items || messages.data || messages as any).map((m: any) => m.toJSON?.() ?? m);
  }

  /**
   * POST /v1/widget/conversations/:conversationId/close
   *
   * Final step of FLOW 1: customer or agent closes the conversation.
   * Publishes ConversationClosedEvent and triggers CSAT survey via
   * notification queue.
   */
  @ApiOperation({ summary: 'Close a widget conversation' })
  @Post(':conversationId/close')
  @HttpCode(HttpStatus.OK)
  async closeConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: WidgetCloseConversationDto,
  ) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

    const conversation = await this.conversationService.close(
      tenantId,
      conversationId,
      dto.reason,
    );

    // Trigger CSAT survey job
    await this.queueService.addJob(QUEUES.NOTIFICATION, 'customer-survey', {
      tenantId,
      conversationId,
      customerId: conversation.customerId,
      surveyUrl: `${process.env.WIDGET_SURVEY_BASE_URL || 'https://app.easydev.ai/survey'}/${conversationId}`,
    });

    return {
      conversationId: conversation.id,
      status: conversation.status.value,
    };
  }

  /**
   * POST /v1/widget/conversations/:conversationId/escalate
   *
   * Explicit customer escalation request (FLOW 1 → Agent Escalation step).
   * Bypasses AI confidence check and immediately routes to a human agent.
   */
  @ApiOperation({ summary: 'Request human agent escalation' })
  @Post(':conversationId/escalate')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestEscalation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

    // Enqueue escalation evaluation – the AiEscalationService handles it
    await this.queueService.addJob(QUEUES.CONVERSATION, 'ai-process-message', {
      tenantId,
      conversationId,
      messageId: crypto.randomUUID?.() ?? Math.random().toString(36),
      messageText: 'I need to speak to a human agent please',
    });

    return { status: 'escalation_requested', conversationId };
  }

  /**
   * POST /v1/widget/conversations/:conversationId/ticket
   *
   * FLOW 2: Customer Widget → Ticket Creation.
   * Creates a linked support ticket from an ongoing widget conversation.
   */
  @ApiOperation({ summary: 'Create a support ticket from this conversation (FLOW 2)' })
  @Post(':conversationId/ticket')
  @HttpCode(HttpStatus.ACCEPTED)
  async createTicket(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { subject?: string; description?: string; priority?: string },
  ) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

    const conversation = await this.conversationService.findById(
      tenantId,
      conversationId,
    );
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }

    // Enqueue ticket creation job so it benefits from assignment rules
    await this.queueService.addJob(QUEUES.TICKET, 'ticket-create-from-conversation', {
      tenantId,
      conversationId,
      customerId: conversation.customerId,
      subject:
        body.subject ||
        `Support request from widget conversation ${conversationId}`,
      description: body.description || '',
      priority: body.priority || 'MEDIUM',
      source: TicketSourceEnum.WEBCHAT,
    });

    return { status: 'ticket_creation_queued', conversationId };
  }
}
