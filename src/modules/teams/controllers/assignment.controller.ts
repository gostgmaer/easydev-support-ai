import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AgentAssignmentService } from '../services/agent-assignment.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Agent Assignment')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AgentAssignmentService) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Trigger routing assignment for a conversation or ticket' })
  async assign(
    @Headers('x-tenant-id') tenantId: string,
    @Body('teamId') teamId: string,
    @Body('entityId') entityId: string,
    @Body('entityType') entityType: 'TICKET' | 'CONVERSATION',
    @Body('options') options?: { requiredSkill?: number; priority?: number }
  ) {
    const assignedAgentId = await this.assignmentService.assignEntity(
      tenantId,
      teamId,
      entityId,
      entityType,
      options
    );
    return { assignedAgentId, success: true };
  }
}
