import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SlaSettingsService } from '../services/sla-settings.service';
import { UpdateSlaSettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings/sla')
@UseGuards(TenantGuard, RbacGuard)
export class SlaSettingsController {
  constructor(private readonly slaSettingsService: SlaSettingsService) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async getSlaSettings(@Headers('x-tenant-id') tenantId: string) {
    const settings = await this.slaSettingsService.getSlaSettings(tenantId);
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateSlaSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateSlaSettingsDto,
  ) {
    const settings = await this.slaSettingsService.updateSlaSettings(
      tenantId,
      dto,
    );
    return settings.toJSON();
  }
}
