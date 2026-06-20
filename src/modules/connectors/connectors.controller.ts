import { Controller, Get, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/connectors')
@UseGuards(TenantGuard, RbacGuard)
export class ConnectorsController {

  @Get()
  @Roles('tenant_admin')
  async getInstalledConnectors(@Headers('x-tenant-id') tenantId: string) {
    return []; 
  }

  @Post('install')
  @Roles('tenant_admin')
  async installConnector(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return { status: 'installed' };
  }
}
