import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('v1/analytics')
@UseGuards(TenantGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles('tenant_admin', 'manager')
  async getOverview(@Headers('x-tenant-id') tenantId: string) {
    return this.analyticsService.getExecutiveOverview(tenantId);
  }
}
