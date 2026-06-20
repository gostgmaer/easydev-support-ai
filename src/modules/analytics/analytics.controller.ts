import { Controller, Get, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/analytics')
@UseGuards(TenantGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('executive-overview')
  @Roles('tenant_admin')
  async getExecutiveOverview(@Headers('x-tenant-id') tenantId: string) {
    return this.analyticsService.getExecutiveOverview(tenantId);
  }
}
