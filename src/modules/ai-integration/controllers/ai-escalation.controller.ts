import { Controller, Get, Post, Query, Headers, Param, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AiEscalationService } from '../services/ai-escalation.service';

@Controller('v1/ai-escalations')
@UseGuards(TenantGuard, RbacGuard)
export class AiEscalationController {
  constructor(private readonly escalationService: AiEscalationService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getEscalations(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
  ) {
    const escalations = await this.escalationService.findEscalations(tenantId, status);
    return escalations.map((e) => e.toJSON());
  }

  @Post(':id/resolve')
  @Roles('tenant_admin', 'agent')
  public async resolveEscalation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const escalation = await this.escalationService.resolveEscalation(tenantId, id);
    return escalation.toJSON();
  }
}
