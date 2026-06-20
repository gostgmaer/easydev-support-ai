import {
  Controller,
  Get,
  Post,
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
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import {
  AssignConversationDto,
  AutoAssignConversationDto,
  TransferConversationDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Conversation Assignment')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/conversations/:conversationId/assignment')
export class ConversationAssignmentController {
  constructor(
    private readonly assignmentService: ConversationAssignmentService,
  ) {}

  @Post('manual')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Manually assign a conversation to an agent' })
  async assign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AssignConversationDto,
    @Req() req: any,
  ) {
    const conversation = await this.assignmentService.assign(
      tenantId,
      conversationId,
      dto.agentProfileId,
      dto.teamId,
      dto.assignmentType || 'MANUAL',
      req.user?.id,
    );
    return conversation.toJSON();
  }

  @Post('auto')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({
    summary: 'Auto-assign a conversation via the team assignment engine',
  })
  async autoAssign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AutoAssignConversationDto,
    @Req() req: any,
  ) {
    const conversation = await this.assignmentService.autoAssign(
      tenantId,
      conversationId,
      dto.teamId,
      req.user?.id,
    );
    return conversation.toJSON();
  }

  @Post('transfer')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Transfer a conversation to another agent' })
  async transfer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: TransferConversationDto,
    @Req() req: any,
  ) {
    const conversation = await this.assignmentService.transfer(
      tenantId,
      conversationId,
      dto.toAgentProfileId,
      req.user?.id,
    );
    return conversation.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List assignment history for a conversation' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const assignments = await this.assignmentService.listAssignments(
      tenantId,
      conversationId,
    );
    return assignments.map((a) => a.toJSON());
  }
}
