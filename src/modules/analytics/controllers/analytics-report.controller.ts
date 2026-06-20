import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AnalyticsReportService } from '../services/analytics-report.service';
import { AnalyticsScheduleService } from '../services/analytics-schedule.service';
import {
  CreateReportDto,
  UpdateReportDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from '../dtos/analytics.dto';

@ApiTags('Analytics Reports')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@Controller('v1/analytics/reports')
@UseGuards(TenantGuard, RbacGuard)
export class AnalyticsReportController {
  constructor(
    private readonly reportService: AnalyticsReportService,
    private readonly scheduleService: AnalyticsScheduleService,
  ) {}

  // ------------ Reports CRUD ------------
  @Post()
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Create a new analytics report definition' })
  @ApiResponse({ status: 201, description: 'Report successfully created.' })
  async createReport(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateReportDto,
  ) {
    const report = await this.reportService.createReport(tenantId, dto);
    return report.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'List all reports for tenant' })
  @ApiResponse({ status: 200, description: 'Reports list' })
  async getReports(
    @Headers('x-tenant-id') tenantId: string,
    @Query('reportType') reportType?: string,
  ) {
    const reports = await this.reportService.findReports(tenantId, reportType);
    return reports.map((r) => r.toJSON());
  }

  @Get(':id')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get details of specific report definition and generated data' })
  @ApiResponse({ status: 200, description: 'Report JSON details' })
  async getReport(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const report = await this.reportService.getReport(tenantId, id);
    return report.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Update report definition' })
  @ApiResponse({ status: 200, description: 'Report successfully updated.' })
  async updateReport(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    const report = await this.reportService.updateReport(tenantId, id, dto);
    return report.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Delete report definition' })
  @ApiResponse({ status: 200, description: 'Report successfully deleted.' })
  async deleteReport(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return { success: await this.reportService.deleteReport(tenantId, id) };
  }

  // ------------ Schedules CRUD ------------
  @Post('schedules')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Create new report delivery schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created.' })
  async createSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    const schedule = await this.scheduleService.createSchedule(tenantId, dto);
    return schedule.toJSON();
  }

  @Get('schedules/list')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'List all report delivery schedules' })
  @ApiResponse({ status: 200, description: 'Schedules list' })
  async getSchedules(
    @Headers('x-tenant-id') tenantId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    const schedules = await this.scheduleService.findSchedules(tenantId, activeOnly);
    return schedules.map((s) => s.toJSON());
  }

  @Get('schedules/:id')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get details of specific schedule' })
  @ApiResponse({ status: 200, description: 'Schedule details JSON' })
  async getSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const schedule = await this.scheduleService.getSchedule(tenantId, id);
    return schedule.toJSON();
  }

  @Put('schedules/:id')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Update schedule details' })
  @ApiResponse({ status: 200, description: 'Schedule updated.' })
  async updateSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const schedule = await this.scheduleService.updateSchedule(tenantId, id, dto);
    return schedule.toJSON();
  }

  @Delete('schedules/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted.' })
  async deleteSchedule(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return { success: await this.scheduleService.deleteSchedule(tenantId, id) };
  }
}
