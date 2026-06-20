import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FeatureFlagService } from '../services/feature-flag.service';
import { SaveFeatureFlagDto } from '../dtos/settings.dto';

@Controller('v1/settings/feature-flags')
@UseGuards(TenantGuard, RbacGuard)
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getFeatureFlags(@Headers('x-tenant-id') tenantId: string) {
    const list = await this.featureFlagService.getFeatureFlags(tenantId);
    return list.map((f) => f.toJSON());
  }

  @Post()
  @Roles('tenant_admin')
  public async saveFeatureFlag(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SaveFeatureFlagDto,
  ) {
    const flag = await this.featureFlagService.saveFeatureFlag(tenantId, dto);
    return flag.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  public async deleteFeatureFlag(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.featureFlagService.deleteFeatureFlag(tenantId, id);
    return { success: true };
  }

  @Get('resolve/:key')
  @Roles('tenant_admin', 'agent')
  public async resolveFlag(
    @Headers('x-tenant-id') tenantId: string,
    @Param('key') key: string,
    @Query('userId') userId?: string,
  ) {
    const enabled = await this.featureFlagService.resolveFlag(tenantId, key, {
      userId,
    });
    return { featureKey: key, enabled };
  }
}
