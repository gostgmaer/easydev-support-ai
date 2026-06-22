import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminWidgetService } from '../services/admin-widget.service';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateAnnouncementDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  WidgetDataQueryDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/admin/dashboards')
export class AdminDashboardController {
  constructor(
    private readonly dashboardService: AdminDashboardService,
    private readonly widgetService: AdminWidgetService,
  ) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId)
      throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  @Get()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List admin dashboards' })
  async list(@Headers('x-tenant-id') tenantId: string) {
    const dashboards = await this.dashboardService.listDashboards(tenantId);
    return dashboards.map((d) => d.toJSON());
  }

  @Post()
  @Roles('tenant_admin')
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Create an admin dashboard' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateDashboardDto,
    @Req() req: any,
  ) {
    const dashboard = await this.dashboardService.createDashboard(
      tenantId,
      dto,
      this.userOf(req),
    );
    return dashboard.toJSON();
  }

  @Get('default')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get the default dashboard' })
  async getDefault(@Headers('x-tenant-id') tenantId: string) {
    const dashboard = await this.dashboardService.getDefaultDashboard(tenantId);
    return dashboard ? dashboard.toJSON() : null;
  }

  @Get('announcements')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List active announcements' })
  async activeAnnouncements(@Headers('x-tenant-id') tenantId: string) {
    const announcements =
      await this.dashboardService.listActiveAnnouncements(tenantId);
    return announcements.map((a) => a.toJSON());
  }

  @Post('announcements')
  @Roles('tenant_admin')
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Create a platform announcement' })
  async createAnnouncement(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    const announcement = await this.dashboardService.createAnnouncement(
      tenantId,
      dto,
    );
    return announcement.toJSON();
  }

  @Post('announcements/:id/deactivate')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Deactivate an announcement' })
  async deactivateAnnouncement(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const announcement = await this.dashboardService.deactivateAnnouncement(
      tenantId,
      id,
    );
    return announcement.toJSON();
  }

  @Delete('announcements/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Delete an announcement' })
  async deleteAnnouncement(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.dashboardService.deleteAnnouncement(tenantId, id);
  }

  @Get(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get a dashboard by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const dashboard = await this.dashboardService.getDashboard(tenantId, id);
    return dashboard.toJSON();
  }

  @Patch(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update a dashboard' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
    @Req() req: any,
  ) {
    const dashboard = await this.dashboardService.updateDashboard(
      tenantId,
      id,
      dto,
      this.userOf(req),
    );
    return dashboard.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Delete a dashboard' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.dashboardService.deleteDashboard(tenantId, id);
  }

  @Get(':id/widgets')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List widgets on a dashboard' })
  async listWidgets(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const widgets = await this.widgetService.listWidgets(tenantId, id);
    return widgets.map((w) => w.toJSON());
  }

  @Post(':id/widgets')
  @Roles('tenant_admin')
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Add a widget to a dashboard' })
  async createWidget(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateWidgetDto,
  ) {
    const widget = await this.widgetService.createWidget(tenantId, id, dto);
    return widget.toJSON();
  }

  @Patch('widgets/:widgetId')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update a widget' })
  async updateWidget(
    @Headers('x-tenant-id') tenantId: string,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    const widget = await this.widgetService.updateWidget(
      tenantId,
      widgetId,
      dto,
    );
    return widget.toJSON();
  }

  @Delete('widgets/:widgetId')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Remove a widget' })
  async deleteWidget(
    @Headers('x-tenant-id') tenantId: string,
    @Param('widgetId') widgetId: string,
  ) {
    return this.widgetService.deleteWidget(tenantId, widgetId);
  }

  @Get('widgets/:widgetId/data')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Compute live data for a widget' })
  async getWidgetData(
    @Headers('x-tenant-id') tenantId: string,
    @Param('widgetId') widgetId: string,
    @Query() query: WidgetDataQueryDto,
  ) {
    return this.widgetService.getWidgetData(
      tenantId,
      widgetId,
      query.timeRange,
    );
  }
}
