import { Controller, Get, Query, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AiUsageService } from '../services/ai-usage.service';

@Controller('v1/ai-usage')
@UseGuards(TenantGuard, RbacGuard)
export class AiUsageController {
  constructor(private readonly usageService: AiUsageService) {}

  @Get()
  @Roles('tenant_admin')
  public async getUsageMetrics(
    @Headers('x-tenant-id') tenantId: string,
    @Query('agentId') agentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const metrics = await this.usageService.getUsageMetrics(tenantId, agentId, startDate, endDate);
    return metrics.map((m) => m.toJSON());
  }
}
