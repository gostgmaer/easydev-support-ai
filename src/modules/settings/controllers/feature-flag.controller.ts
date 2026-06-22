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
import { TenantOnlyGuard } from '../../../common/guards/tenant-only.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FeatureFlagService } from '../services/feature-flag.service';
import { SaveFeatureFlagDto } from '../dtos/settings.dto';

@Controller('v1/settings/feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  // Reads are tenant-scoped, not user-scoped, and must be reachable by callers
  // with no IAM session at all (the Customer Widget, Help Center, any pre-login
  // page) - see TenantOnlyGuard's doc comment.
  @Get()
  @UseGuards(TenantOnlyGuard)
  public async getFeatureFlags(@Headers('x-tenant-id') tenantId: string) {
    const list = await this.featureFlagService.getFeatureFlags(tenantId);
    return list.map((f) => f.toJSON());
  }

  @Post()
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  public async saveFeatureFlag(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SaveFeatureFlagDto,
  ) {
    const flag = await this.featureFlagService.saveFeatureFlag(tenantId, dto);
    return flag.toJSON();
  }

  @Delete(':id')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  public async deleteFeatureFlag(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.featureFlagService.deleteFeatureFlag(tenantId, id);
    return { success: true };
  }

  @Get('resolve/:key')
  @UseGuards(TenantOnlyGuard)
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
