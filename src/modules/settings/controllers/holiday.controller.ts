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
import { HolidayService } from '../services/holiday.service';
import { SaveHolidayDto } from '../dtos/settings.dto';

@Controller('v1/settings/holidays')
@UseGuards(TenantGuard, RbacGuard)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getHolidays(@Headers('x-tenant-id') tenantId: string) {
    const list = await this.holidayService.getHolidays(tenantId);
    return list.map((h) => h.toJSON());
  }

  @Post()
  @Roles('tenant_admin')
  public async saveHoliday(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SaveHolidayDto,
  ) {
    const holiday = await this.holidayService.saveHoliday(tenantId, dto);
    return holiday.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  public async deleteHoliday(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.holidayService.deleteHoliday(tenantId, id);
    return { success: true };
  }
}
