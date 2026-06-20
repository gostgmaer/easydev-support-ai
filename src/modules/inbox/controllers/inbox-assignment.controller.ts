import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InboxAssignmentService } from '../services/inbox-assignment.service';
import {
  AssignInboxDto,
  TransferInboxDto,
  RoundRobinAssignDto,
  AssignTeamDto,
  BulkAssignDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbox Assignment')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox')
export class InboxAssignmentController {
  constructor(private readonly assignmentService: InboxAssignmentService) {}

  @Post('bulk/assign')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Bulk assign conversations to an agent' })
  async bulkAssign(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: BulkAssignDto,
    @Req() req: any,
  ) {
    return this.assignmentService.bulkAssign(
      tenantId,
      dto.conversationIds,
      dto.agentId,
      req.user?.id,
    );
  }

  @Get(':conversationId/assignments')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List assignment history for a conversation' })
  async assignments(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.assignmentService.listAssignments(tenantId, conversationId);
  }

  @Post(':conversationId/assign')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Assign a conversation to an agent' })
  async assign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AssignInboxDto,
    @Req() req: any,
  ) {
    return this.assignmentService.assign(
      tenantId,
      conversationId,
      dto.agentId,
      dto.teamId,
      req.user?.id,
    );
  }

  @Post(':conversationId/force-assign')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Force assign a conversation to an agent' })
  async force(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AssignInboxDto,
    @Req() req: any,
  ) {
    return this.assignmentService.force(
      tenantId,
      conversationId,
      dto.agentId,
      req.user?.id,
    );
  }

  @Post(':conversationId/transfer')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Transfer a conversation to another agent' })
  async transfer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: TransferInboxDto,
    @Req() req: any,
  ) {
    return this.assignmentService.transfer(
      tenantId,
      conversationId,
      dto.toAgentId,
      req.user?.id,
    );
  }

  @Post(':conversationId/assign-team')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Assign a conversation to a team' })
  async assignTeam(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AssignTeamDto,
    @Req() req: any,
  ) {
    return this.assignmentService.assignToTeam(
      tenantId,
      conversationId,
      dto.teamId,
      req.user?.id,
    );
  }

  @Post(':conversationId/round-robin')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Round-robin assign within a team' })
  async roundRobin(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: RoundRobinAssignDto,
    @Req() req: any,
  ) {
    return this.assignmentService.roundRobin(
      tenantId,
      conversationId,
      dto.teamId,
      req.user?.id,
    );
  }

  @Post(':conversationId/unassign')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Unassign a conversation' })
  async unassign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.assignmentService.unassign(
      tenantId,
      conversationId,
      req.user?.id,
    );
  }
}
