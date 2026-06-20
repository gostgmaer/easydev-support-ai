import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MessageService } from '../services/message.service';
import { MessageDeliveryService } from '../services/message-delivery.service';
import { MessageSearchService } from '../services/message-search.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  ReplyMessageDto,
  SendMessageDto,
  MessageQueryDto,
  ReactMessageDto,
  MentionMessageDto,
  BulkMessageOperationDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Messages')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly deliveryService: MessageDeliveryService,
    private readonly searchService: MessageSearchService,
  ) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Create a message' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message created' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: any,
  ) {
    const message = await this.messageService.create(
      tenantId,
      dto,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List, filter and paginate messages' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: MessageQueryDto,
  ) {
    const result = await this.messageService.findPaginated(tenantId, query);
    return {
      data: result.data.map((m) => m.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  @Get('search')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Full text search messages' })
  async search(
    @Headers('x-tenant-id') tenantId: string,
    @Query('q') q: string,
  ) {
    const results = await this.searchService.search(tenantId, q || '');
    return results.map((m) => m.toJSON());
  }

  @Get('thread/:threadId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List all messages in a thread' })
  async thread(
    @Headers('x-tenant-id') tenantId: string,
    @Param('threadId') threadId: string,
  ) {
    const results = await this.messageService.getThread(tenantId, threadId);
    return results.map((m) => m.toJSON());
  }

  @Get('conversation/:conversationId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List messages for a conversation' })
  async byConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: MessageQueryDto,
  ) {
    const result = await this.messageService.findByConversation(
      tenantId,
      conversationId,
      query,
    );
    return {
      data: result.data.map((m) => m.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  @Post('bulk/status')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Bulk update message status' })
  async bulkStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: BulkMessageOperationDto,
    @Req() req: any,
  ) {
    return this.messageService.bulkUpdateStatus(
      tenantId,
      dto.messageIds,
      dto.status,
      req.user?.id,
    );
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a message by ID' })
  async findById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const message = await this.messageService.findById(tenantId, id);
    return message.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Update a message' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: any,
  ) {
    const message = await this.messageService.update(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Post(':id/reply')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Reply to a message (threaded)' })
  async reply(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReplyMessageDto,
    @Req() req: any,
  ) {
    const message = await this.messageService.reply(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Post(':id/send')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Dispatch a message through its channel' })
  async send(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const message = await this.deliveryService.queueSend(
      tenantId,
      id,
      {
        templateName: dto.templateName,
        variables: dto.variables,
        channelId: dto.channelId,
      },
      req.user?.id,
    );
    return message.toJSON();
  }

  @Post(':id/retry')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Retry a failed message' })
  async retry(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const message = await this.deliveryService.retry(
      tenantId,
      id,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Get(':id/delivery')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List delivery attempts for a message' })
  async delivery(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const statuses = await this.deliveryService.listDeliveryStatuses(
      tenantId,
      id,
    );
    return statuses.map((s) => s.toJSON());
  }

  @Post(':id/read')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Mark a message as read' })
  async markRead(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const message = await this.messageService.markRead(
      tenantId,
      id,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Post(':id/archive')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Archive a message' })
  async archive(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const message = await this.messageService.archive(
      tenantId,
      id,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Post(':id/reactions')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'React to a message' })
  async react(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReactMessageDto,
  ) {
    const message = await this.messageService.react(
      tenantId,
      id,
      dto.userId,
      dto.reaction,
    );
    return message.toJSON();
  }

  @Delete(':id/reactions')
  @Roles('tenant_admin', 'support_agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  async removeReaction(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReactMessageDto,
  ) {
    await this.messageService.removeReaction(
      tenantId,
      id,
      dto.userId,
      dto.reaction,
    );
  }

  @Post(':id/mentions')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Mention a user in a message' })
  async mention(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: MentionMessageDto,
    @Req() req: any,
  ) {
    const message = await this.messageService.mention(
      tenantId,
      id,
      dto.mentionedUserId,
      req.user?.id,
    );
    return message.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a message' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.messageService.delete(tenantId, id, req.user?.id);
  }
}
