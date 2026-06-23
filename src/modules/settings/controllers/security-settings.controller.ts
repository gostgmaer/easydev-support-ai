import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SecuritySettingsService } from '../services/security-settings.service';
import { UpdateSecuritySettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings/security')
@UseGuards(TenantGuard, RbacGuard)
export class SecuritySettingsController {
  constructor(
    private readonly securitySettingsService: SecuritySettingsService,
  ) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async getSecuritySettings(@Headers('x-tenant-id') tenantId: string) {
    const settings =
      await this.securitySettingsService.getSecuritySettings(tenantId);
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateSecuritySettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateSecuritySettingsDto,
  ) {
    const settings = await this.securitySettingsService.updateSecuritySettings(
      tenantId,
      dto,
    );
    return settings.toJSON();
  }
}
