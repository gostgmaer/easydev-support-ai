import {
  Controller,
  Get,
  Query,
  Headers,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { CustomMetricQueryDto } from '../dtos/analytics.dto';

@ApiTags('Analytics Dashboard')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@Controller('v1/analytics/dashboard')
@UseGuards(TenantGuard, RbacGuard)
export class AnalyticsDashboardController {
  constructor(private readonly dashboardService: AnalyticsDashboardService) {}

  @Get()
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get general overview dashboard metrics' })
  @ApiResponse({
    status: 200,
    description: 'SLA, CSAT, Conversations, Messages counters',
  })
  async getDashboard(
    @Headers('x-tenant-id') tenantId: string,
    @Query('timeRange') timeRange: string = 'Last 30 Days',
  ) {
    return this.dashboardService.getDashboardMetrics(tenantId, timeRange);
  }

  @Get('ai')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get AI resolution and cost savings metrics' })
  @ApiResponse({
    status: 200,
    description: 'AI requests, tokens used, cost metrics',
  })
  async getAiMetrics(
    @Headers('x-tenant-id') tenantId: string,
    @Query('timeRange') timeRange: string = 'Last 30 Days',
  ) {
    return this.dashboardService.getAiDashboardMetrics(tenantId, timeRange);
  }

  @Get('agents')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get comparative summary for all agents' })
  @ApiResponse({
    status: 200,
    description: 'Agent workloads and response rates',
  })
  async getAgentSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Query('timeRange') timeRange: string = 'Last 30 Days',
  ) {
    return this.dashboardService.getAgentSummaryMetrics(tenantId, timeRange);
  }

  @Get('agents/:agentId')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get metrics details for specific agent' })
  @ApiResponse({
    status: 200,
    description: 'Agent assigned vs resolved tickets, utilization',
  })
  async getAgentMetrics(
    @Headers('x-tenant-id') tenantId: string,
    @Param('agentId') agentId: string,
    @Query('timeRange') timeRange: string = 'Last 30 Days',
  ) {
    return this.dashboardService.getAgentDashboardMetrics(
      tenantId,
      agentId,
      timeRange,
    );
  }

  @Get('channels')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get summary metrics for all channels' })
  @ApiResponse({ status: 200, description: 'Usage volumes by channels' })
  async getChannelSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Query('timeRange') timeRange: string = 'Last 30 Days',
  ) {
    return this.dashboardService.getChannelSummaryMetrics(tenantId, timeRange);
  }

  @Get('channels/:channelId')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get metrics details for specific channel' })
  @ApiResponse({
    status: 200,
    description: 'Channel volumes, response times, delivery rates',
  })
  async getChannelMetrics(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Query('timeRange') timeRange: string = 'Last 30 Days',
  ) {
    return this.dashboardService.getChannelDashboardMetrics(
      tenantId,
      channelId,
      timeRange,
    );
  }

  @Get('custom')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get custom date-range metrics for custom charts' })
  @ApiResponse({ status: 200, description: 'Array of metrics points' })
  async getCustomMetrics(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: CustomMetricQueryDto,
  ) {
    return this.dashboardService.getCustomMetrics(
      tenantId,
      query.metricType,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }
}
