import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { InboxService } from '../services/inbox.service';
import { InboxQueryDto } from '../dtos';
import type { InboxQueryOptions } from '../repositories/conversation-repository.interface';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbox')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Unified inbox listing (read model, cached)' })
  async list(@Headers('x-tenant-id') tenantId: string, @Query() query: InboxQueryDto) {
    return this.inboxService.listInbox(tenantId, query as InboxQueryOptions);
  }

  @Get('unread')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Unread conversation count for the current view' })
  async unread(@Headers('x-tenant-id') tenantId: string, @Query() query: InboxQueryDto) {
    return this.inboxService.unreadCount(tenantId, query as InboxQueryOptions);
  }

  @Get('mine')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Conversations assigned to the current agent' })
  async mine(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: InboxQueryDto,
    @Req() req: any,
  ) {
    const agentProfileId = req.user?.agentProfileId || req.user?.id;
    return this.inboxService.myConversations(tenantId, agentProfileId, query as InboxQueryOptions);
  }

  @Get('unassigned')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Unassigned conversations queue' })
  async unassigned(@Headers('x-tenant-id') tenantId: string, @Query() query: InboxQueryDto) {
    return this.inboxService.unassigned(tenantId, query as InboxQueryOptions);
  }

  @Get('team/:teamId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Conversations assigned to a team' })
  async team(
    @Headers('x-tenant-id') tenantId: string,
    @Param('teamId') teamId: string,
    @Query() query: InboxQueryDto,
  ) {
    return this.inboxService.teamConversations(tenantId, teamId, query as InboxQueryOptions);
  }

  @Get('priority/:priority')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Priority-filtered inbox view' })
  async priority(
    @Headers('x-tenant-id') tenantId: string,
    @Param('priority') priority: string,
    @Query() query: InboxQueryDto,
  ) {
    return this.inboxService.priorityView(tenantId, priority, query as InboxQueryOptions);
  }
}
