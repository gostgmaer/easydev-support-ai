import {
  Controller,
  Get,
  Put,
  Body,
  Headers,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ChannelSettingsService } from '../services/channel-settings.service';
import { UpdateChannelSettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings/channels')
@UseGuards(TenantGuard, RbacGuard)
export class ChannelSettingsController {
  constructor(
    private readonly channelSettingsService: ChannelSettingsService,
  ) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async getChannelSettings(@Headers('x-tenant-id') tenantId: string) {
    const list = await this.channelSettingsService.getChannelSettings(tenantId);
    return list.map((c) => c.toJSON());
  }

  @Get(':type')
  @Roles('tenant_admin', 'support_agent')
  public async getChannelSettingsByType(
    @Headers('x-tenant-id') tenantId: string,
    @Param('type') type: string,
  ) {
    const settings = await this.channelSettingsService.getChannelSettingsByType(
      tenantId,
      type,
    );
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateChannelSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateChannelSettingsDto,
  ) {
    const settings = await this.channelSettingsService.updateChannelSettings(
      tenantId,
      dto,
    );
    return settings.toJSON();
  }
}
