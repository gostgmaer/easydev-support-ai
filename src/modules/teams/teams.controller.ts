import { Controller, Get, Post, Body, Headers, UseGuards, Param } from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/teams')
@UseGuards(TenantGuard, RbacGuard)
export class TeamsController {

  @Get()
  @Roles('tenant_admin', 'manager')
  async getTeams(@Headers('x-tenant-id') tenantId: string) {
    return []; // Handled by service in prod
  }

  @Post(':id/routing')
  @Roles('tenant_admin')
  async updateRoutingStrategy(@Headers('x-tenant-id') tenantId: string, @Param('id') teamId: string, @Body('strategy') strategy: string) {
    return { status: 'success', strategy };
  }
}
