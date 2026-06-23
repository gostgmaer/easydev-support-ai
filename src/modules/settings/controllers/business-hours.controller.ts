import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Headers,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BusinessHoursService } from '../services/business-hours.service';
import { SaveBusinessHoursDto } from '../dtos/settings.dto';

@Controller('v1/settings/business-hours')
@UseGuards(TenantGuard, RbacGuard)
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async getBusinessHours(@Headers('x-tenant-id') tenantId: string) {
    const list = await this.businessHoursService.getBusinessHours(tenantId);
    return list.map((h) => h.toJSON());
  }

  @Post()
  @Roles('tenant_admin')
  public async saveBusinessHours(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SaveBusinessHoursDto,
  ) {
    const hours = await this.businessHoursService.saveBusinessHours(
      tenantId,
      dto,
    );
    return hours.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  public async deleteBusinessHours(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.businessHoursService.deleteBusinessHours(tenantId, id);
    return { success: true };
  }

  @Get('is-open')
  @Roles('tenant_admin', 'support_agent')
  public async isOpenNow(@Headers('x-tenant-id') tenantId: string) {
    const open = await this.businessHoursService.isOpenNow(tenantId);
    return { isOpen: open };
  }

  @Get('next-open')
  @Roles('tenant_admin', 'support_agent')
  public async getNextOpenTime(@Headers('x-tenant-id') tenantId: string) {
    const time = await this.businessHoursService.getNextOpenTime(tenantId);
    return { nextOpenTime: time ? time.toISOString() : null };
  }
}
