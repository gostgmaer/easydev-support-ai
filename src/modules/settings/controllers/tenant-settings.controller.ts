import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantSettingsService } from '../services/tenant-settings.service';
import { UpdateTenantSettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings')
@UseGuards(TenantGuard, RbacGuard)
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getSettings(@Headers('x-tenant-id') tenantId: string) {
    const settings = await this.tenantSettingsService.getSettings(tenantId);
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    const settings = await this.tenantSettingsService.updateSettings(
      tenantId,
      dto,
    );
    return settings.toJSON();
  }
}
