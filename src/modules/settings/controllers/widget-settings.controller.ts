import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { WidgetSettingsService } from '../services/widget-settings.service';
import { UpdateWidgetSettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings/widget')
@UseGuards(TenantGuard, RbacGuard)
export class WidgetSettingsController {
  constructor(private readonly widgetSettingsService: WidgetSettingsService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getWidgetSettings(@Headers('x-tenant-id') tenantId: string) {
    const settings =
      await this.widgetSettingsService.getWidgetSettings(tenantId);
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateWidgetSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    const settings = await this.widgetSettingsService.updateWidgetSettings(
      tenantId,
      dto,
    );
    return settings.toJSON();
  }
}
