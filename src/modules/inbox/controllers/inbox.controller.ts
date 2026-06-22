import {
  Controller,
  Get,
  Post,
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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InboxService } from '../services/inbox.service';
import {
  InboxQueryDto,
  CreateFilterDto,
  CreateSavedViewDto,
  ReplayWorkflowDto,
  RetryConnectorDto,
  AiDraftDecisionDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbox')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId)
      throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List inbox conversations (projection)' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: InboxQueryDto,
  ) {
    return this.inboxService.list(tenantId, query);
  }

  @Get('counters')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Live inbox counters for the current agent' })
  async counters(@Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    return this.inboxService.getCounters(tenantId, this.userOf(req));
  }

  @Get('filters')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List inbox filters' })
  async listFilters(@Headers('x-tenant-id') tenantId: string) {
    const filters = await this.inboxService.listFilters(tenantId);
    return filters.map((f) => f.toJSON());
  }

  @Post('filters')
  @Roles('tenant_admin', 'support_agent')
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Filter created' })
  @ApiOperation({ summary: 'Create an inbox filter' })
  async createFilter(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateFilterDto,
    @Req() req: any,
  ) {
    const filter = await this.inboxService.createFilter(
      tenantId,
      dto,
      this.userOf(req),
    );
    return filter.toJSON();
  }

  @Delete('filters/:id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Delete an inbox filter' })
  async deleteFilter(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.deleteFilter(tenantId, id);
  }

  @Get('saved-views')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List saved views for the current agent' })
  async listSavedViews(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    const views = await this.inboxService.listSavedViews(
      tenantId,
      this.userOf(req),
    );
    return views.map((v) => v.toJSON());
  }

  @Post('saved-views')
  @Roles('tenant_admin', 'support_agent')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Saved view created',
  })
  @ApiOperation({ summary: 'Create a saved view' })
  async createSavedView(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateSavedViewDto,
    @Req() req: any,
  ) {
    const view = await this.inboxService.createSavedView(
      tenantId,
      this.userOf(req),
      dto,
    );
    return view.toJSON();
  }

  @Delete('saved-views/:id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Delete a saved view' })
  async deleteSavedView(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.deleteSavedView(tenantId, id);
  }

  @Get(':conversationId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a single inbox conversation view' })
  async getView(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.inboxService.getConversationView(tenantId, conversationId);
  }

  @Post(':conversationId/read')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Mark a conversation as read' })
  async markRead(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.markRead(
      tenantId,
      conversationId,
      this.userOf(req),
    );
    return { read: true };
  }

  @Post(':conversationId/resolve')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Resolve a conversation' })
  async resolve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.resolve(tenantId, conversationId, this.userOf(req));
    return { resolved: true };
  }

  @Post(':conversationId/archive')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Archive a conversation' })
  async archive(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.archive(tenantId, conversationId, this.userOf(req));
    return { archived: true };
  }

  @Post(':conversationId/take-over')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Take a conversation over from the AI agent' })
  async takeOver(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.takeOverFromAi(
      tenantId,
      conversationId,
      this.userOf(req),
    );
    return { aiHandling: false };
  }

  @Post(':conversationId/return-to-ai')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Return a conversation to the AI agent' })
  async returnToAi(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.returnToAi(
      tenantId,
      conversationId,
      this.userOf(req),
    );
    return { aiHandling: true };
  }

  @Post(':conversationId/pause-ai')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Pause the AI agent on a conversation' })
  async pauseAi(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.setAiPaused(
      tenantId,
      conversationId,
      true,
      this.userOf(req),
    );
    return { aiPaused: true };
  }

  @Post(':conversationId/resume-ai')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Resume the AI agent on a conversation' })
  async resumeAi(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    await this.inboxService.setAiPaused(
      tenantId,
      conversationId,
      false,
      this.userOf(req),
    );
    return { aiPaused: false };
  }

  @Post(':conversationId/ai-draft')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Approve or reject an AI draft response' })
  async decideAiDraft(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AiDraftDecisionDto,
    @Req() req: any,
  ) {
    await this.inboxService.decideAiDraft(
      tenantId,
      conversationId,
      dto.draftId,
      dto.approved,
      this.userOf(req),
    );
    return { decided: true, approved: dto.approved };
  }

  @Post(':conversationId/replay-workflow')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Replay a workflow for a conversation' })
  async replayWorkflow(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: ReplayWorkflowDto,
    @Req() req: any,
  ) {
    await this.inboxService.replayWorkflow(
      tenantId,
      conversationId,
      dto.workflowId,
      this.userOf(req),
    );
    return { replayed: true };
  }

  @Post(':conversationId/retry-connector')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Retry a connector execution for a conversation' })
  async retryConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: RetryConnectorDto,
    @Req() req: any,
  ) {
    await this.inboxService.retryConnector(
      tenantId,
      conversationId,
      dto.executionId,
      this.userOf(req),
    );
    return { retried: true };
  }
}
