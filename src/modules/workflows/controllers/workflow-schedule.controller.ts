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
import { WorkflowScheduleService } from '../services/workflow-schedule.service';
import { CreateScheduleDto } from '../dtos/workflow.dto';

@Controller('v1/workflows/schedules')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowScheduleController {
  constructor(private readonly scheduleService: WorkflowScheduleService) {}

  @Post()
  @Roles('tenant_admin')
  public async createSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    const schedule = await this.scheduleService.createSchedule(tenantId, dto);
    return schedule.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'manager')
  public async getSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const schedule = await this.scheduleService.getSchedule(tenantId, id);
    return schedule.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'manager')
  public async findSchedules(
    @Headers('x-tenant-id') tenantId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const active = activeOnly === 'true';
    const schedules = await this.scheduleService.findSchedules(
      tenantId,
      active,
    );
    return schedules.map((s) => s.toJSON());
  }

  @Post(':id/toggle')
  @Roles('tenant_admin')
  public async toggleSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    const schedule = await this.scheduleService.toggleSchedule(
      tenantId,
      id,
      active,
    );
    return schedule.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  public async deleteSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.scheduleService.deleteSchedule(tenantId, id);
    return { success: true };
  }
}
