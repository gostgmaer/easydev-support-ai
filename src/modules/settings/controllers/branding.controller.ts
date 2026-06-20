import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BrandingService } from '../services/branding.service';
import { UpdateBrandingDto } from '../dtos/settings.dto';

@Controller('v1/settings/branding')
@UseGuards(TenantGuard, RbacGuard)
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getBranding(@Headers('x-tenant-id') tenantId: string) {
    const branding = await this.brandingService.getBranding(tenantId);
    return branding.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateBranding(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    const branding = await this.brandingService.updateBranding(tenantId, dto);
    return branding.toJSON();
  }
}
