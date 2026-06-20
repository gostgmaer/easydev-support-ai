import { Controller, Get, Post, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/customers')
@UseGuards(TenantGuard, RbacGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  async getCustomers(@Headers('x-tenant-id') tenantId: string) {
    return this.customersService.findAll(tenantId);
  }

  @Get(':id')
  async getCustomer360(@Headers('x-tenant-id') tenantId: string, @Param('id') customerId: string) {
    return this.customersService.getCustomer360(tenantId, customerId);
  }

  @Post()
  async createCustomer(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.customersService.create(tenantId, data);
  }
}
