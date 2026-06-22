import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantProvisioningService } from '../services/tenant-provisioning.service';
import { ProvisionTenantDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

// Tenant *identity* (the tenant id itself, plus the calling admin's JWT for
// it) is created upstream in the EasyDev IAM service - TenantGuard requires a
// valid tenant-scoped JWT on every request here, so there is no endpoint in
// this service that creates a tenant from nothing. This controller exposes
// the part that does live here: provisioning this product's own per-tenant
// resources (settings, branding, feature flags, first API key) once IAM
// already knows about the tenant and the caller has a tenant_admin JWT for it.
@ApiTags('Admin Tenant Provisioning')
@Controller('v1/admin/tenants')
export class AdminTenantController {
  constructor(
    private readonly provisioningService: TenantProvisioningService,
  ) {}

  @Post('provision')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiOperation({
    summary:
      'Provision default settings, branding, feature flags, and an initial API key for this tenant',
  })
  async provision(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ProvisionTenantDto,
  ) {
    return this.provisioningService.provision(tenantId, dto);
  }
}
