import { Controller, Get, Put, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UsageLimitService } from '../services/usage-limit.service';
import { UpdateUsageLimitsDto } from '../dtos/settings.dto';

@Controller('v1/settings/usage-limits')
@UseGuards(TenantGuard, RbacGuard)
export class UsageLimitController {
  constructor(private readonly usageLimitService: UsageLimitService) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async getUsageLimits(@Headers('x-tenant-id') tenantId: string) {
    const limits = await this.usageLimitService.getUsageLimits(tenantId);
    return limits.toJSON();
  }

  @Put()
  @Roles('tenant_admin')
  public async updateUsageLimits(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateUsageLimitsDto,
  ) {
    const limits = await this.usageLimitService.updateUsageLimits(
      tenantId,
      dto,
    );
    return limits.toJSON();
  }
}
