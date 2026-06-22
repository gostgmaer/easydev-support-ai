import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { MessageService } from '../services/message.service';
import { MessageAttachmentService } from '../services/message-attachment.service';
import { ConversationService } from '../../conversations/services/conversation.service';
import { CustomerService } from '../../customers/services/customer.service';
import { ChannelService } from '../../channels/services/channel.service';
import { ChannelTypeEnum } from '../../channels/domain/value-objects';
import { WidgetSessionService } from '../../widget/services/widget-session.service';
import {
  WidgetSessionGuard,
  WidgetSessionContext,
} from '../../widget/guards/widget-session.guard';
import { MessageDirectionEnum, MessageTypeEnum } from '../domain/value-objects';
import {
  StartWidgetConversationDto,
  SendWidgetMessageDto,
  CreateWidgetTicketDto,
  SubmitWidgetFeedbackDto,
  MessageQueryDto,
} from '../dtos';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { TicketSourceEnum } from '../../tickets/domain/value-objects';
import { CsatSurveyService } from '../../analytics/services/csat-survey.service';

const WIDGET_ATTACHMENTS_DIR = join(process.cwd(), 'uploads', 'widget-attachments');
const PUBLIC_BASE_URL = process.env.API_PUBLIC_URL || 'http://localhost:3000';
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Widget-facing messaging surface, authenticated by widget session token
 * (WidgetSessionGuard) rather than IAM - widget visitors never hold an IAM
 * identity. Fronts the same Conversation/Message domain services agents use.
 */
@ApiTags('Widget Chat')
@ApiHeader({ name: 'x-tenant-id', required: true })
@ApiSecurity('widget-session-token')
@UseGuards(WidgetSessionGuard)
@Controller('v1/widget/conversations')
export class WidgetChatController {
  constructor(
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly customerService: CustomerService,
    private readonly channelService: ChannelService,
    private readonly widgetSessionService: WidgetSessionService,
    private readonly queueService: QueueService,
    private readonly csatSurveyService: CsatSurveyService,
    private readonly attachmentService: MessageAttachmentService,
  ) {}

  private async assertOwnership(
    widgetSession: WidgetSessionContext,
    conversationId: string,
  ): Promise<void> {
    const linkedIds =
      await this.widgetSessionService.findConversationIdsBySession(
        widgetSession.tenantId,
        widgetSession.sessionId,
      );
    if (!linkedIds.includes(conversationId)) {
      throw new ForbiddenException(
        'Conversation does not belong to this widget session',
      );
    }
  }

  @ApiOperation({
    summary: "Start (or resume) the widget session's conversation",
  })
  @Post()
  async startConversation(
    @Req() req: any,
    @Body() dto: StartWidgetConversationDto,
  ) {
    const widgetSession: WidgetSessionContext = req.widgetSession;
    const { tenantId, sessionId } = widgetSession;

    const existingIds =
      await this.widgetSessionService.findConversationIdsBySession(
        tenantId,
        sessionId,
      );
    if (existingIds.length > 0) {
      const conversation = await this.conversationService.findById(
        tenantId,
        existingIds[0],
      );
      return conversation.toJSON();
    }

    if (!dto.email) {
      throw new BadRequestException(
        'Email is required to start a new conversation',
      );
    }

    let customer = await this.customerService.findByEmail(tenantId, dto.email);
    if (!customer) {
      customer = await this.customerService.create(tenantId, {
        email: dto.email,
        source: 'WIDGET',
        profile: dto.name ? { displayName: dto.name } : undefined,
      });
    }

    const channels = await this.channelService.findPaginated(tenantId, {
      type: ChannelTypeEnum.WEBCHAT,
      page: 1,
      limit: 1,
    });
    const channel = channels?.data?.[0];
    if (!channel) {
      throw new BadRequestException(
        'No webchat channel configured for this tenant',
      );
    }

    const conversation = await this.conversationService.create(tenantId, {
      customerId: customer.id,
      channelId: channel.id,
      subject: dto.subject || 'Website Chat',
      source: 'WIDGET',
    });

    await this.widgetSessionService.linkConversation(
      tenantId,
      sessionId,
      conversation.id,
    );

    return conversation.toJSON();
  }

  @ApiOperation({
    summary: "List messages for the widget session's conversation",
  })
  @Get(':conversationId/messages')
  async listMessages(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Query() query: MessageQueryDto,
  ) {
    const widgetSession: WidgetSessionContext = req.widgetSession;
    await this.assertOwnership(widgetSession, conversationId);
    const result = await this.messageService.findByConversation(
      widgetSession.tenantId,
      conversationId,
      query,
    );
    // Internal agent notes must never be visible to the widget visitor.
    return {
      ...result,
      data: result.data
        .filter((m) => m.messageType.value !== MessageTypeEnum.INTERNAL_NOTE)
        .map((m) => m.toJSON()),
    };
  }

  @ApiOperation({ summary: 'Send a message as the widget visitor' })
  @Post(':conversationId/messages')
  async sendMessage(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendWidgetMessageDto,
  ) {
    const widgetSession: WidgetSessionContext = req.widgetSession;
    await this.assertOwnership(widgetSession, conversationId);

    const message = await this.messageService.create(widgetSession.tenantId, {
      conversationId,
      senderId: widgetSession.visitorId,
      senderType: 'CUSTOMER',
      direction: MessageDirectionEnum.INBOUND,
      content: dto.content,
    });
    return message.toJSON();
  }

  @ApiOperation({
    summary: 'Create a support ticket from this widget conversation',
  })
  @Post(':conversationId/ticket')
  async createTicket(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateWidgetTicketDto,
  ) {
    const widgetSession: WidgetSessionContext = req.widgetSession;
    await this.assertOwnership(widgetSession, conversationId);

    const conversation = await this.conversationService.findById(
      widgetSession.tenantId,
      conversationId,
    );

    await this.queueService.addJob(
      QUEUES.TICKET,
      'ticket-create-from-conversation',
      {
        tenantId: widgetSession.tenantId,
        conversationId,
        customerId: conversation.customerId,
        subject: dto.subject,
        description: dto.description || '',
        priority: dto.priority || 'MEDIUM',
        source: TicketSourceEnum.WEBCHAT,
      },
    );

    return { status: 'ticket_creation_queued', conversationId };
  }

  @ApiOperation({
    summary: 'Submit a CSAT rating/feedback for this widget conversation',
  })
  @Post(':conversationId/feedback')
  async submitFeedback(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SubmitWidgetFeedbackDto,
  ) {
    const widgetSession: WidgetSessionContext = req.widgetSession;
    await this.assertOwnership(widgetSession, conversationId);

    await this.csatSurveyService.submit(
      widgetSession.tenantId,
      conversationId,
      dto.rating,
      dto.feedback,
      'WIDGET',
    );

    return { submitted: true };
  }

  /**
   * Saves the upload to local disk (served back via app.useStaticAssets in
   * main.ts) rather than the External File Upload Service - this surface has
   * no integration with that service, and there's no documented contract for
   * a browser to upload to it directly. See MessageAttachmentService.registerLocal.
   */
  @ApiOperation({
    summary: 'Upload a file and attach it to a new message in this widget conversation',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':conversationId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(WIDGET_ATTACHMENTS_DIR, { recursive: true });
          cb(null, WIDGET_ATTACHMENTS_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    }),
  )
  async uploadAttachment(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const widgetSession: WidgetSessionContext = req.widgetSession;
    await this.assertOwnership(widgetSession, conversationId);

    const messageType = file.mimetype.startsWith('image/')
      ? MessageTypeEnum.IMAGE
      : MessageTypeEnum.DOCUMENT;

    const message = await this.messageService.create(widgetSession.tenantId, {
      conversationId,
      senderId: widgetSession.visitorId,
      senderType: 'CUSTOMER',
      direction: MessageDirectionEnum.INBOUND,
      messageType,
      content: file.originalname,
    });

    const attachment = await this.attachmentService.registerLocal(
      widgetSession.tenantId,
      message.id,
      {
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: file.path,
        publicUrl: `${PUBLIC_BASE_URL}/uploads/widget-attachments/${file.filename}`,
      },
      widgetSession.visitorId,
    );

    return { message: message.toJSON(), attachment: attachment.toJSON() };
  }
}
