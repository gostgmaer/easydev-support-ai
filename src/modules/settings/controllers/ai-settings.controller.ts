import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AiSettingsService } from '../services/ai-settings.service';
import { UpdateAiSettingsDto } from '../dtos/settings.dto';

@Controller('v1/settings/ai')
@UseGuards(TenantGuard, RbacGuard)
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getAiSettings(@Headers('x-tenant-id') tenantId: string) {
    const settings = await this.aiSettingsService.getAiSettings(tenantId);
    return settings.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateAiSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    const settings = await this.aiSettingsService.updateAiSettings(
      tenantId,
      dto,
    );
    return settings.toJSON();
  }
}
