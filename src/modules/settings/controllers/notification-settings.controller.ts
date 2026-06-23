import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NotificationSettingsService } from '../services/notification-settings.service';
import { UpdateNotificationSettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings/notifications')
@UseGuards(TenantGuard, RbacGuard)
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async getNotificationSettings(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const settings =
      await this.notificationSettingsService.getNotificationSettings(tenantId);
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateNotificationSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    const settings =
      await this.notificationSettingsService.updateNotificationSettings(
        tenantId,
        dto,
      );
    return settings.toJSON();
  }
}
