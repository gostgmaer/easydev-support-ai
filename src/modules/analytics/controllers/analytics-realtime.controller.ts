import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AnalyticsRealtimeService } from '../services/analytics-realtime.service';

@ApiTags('Analytics Realtime')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@Controller('v1/analytics/realtime')
@UseGuards(TenantGuard, RbacGuard)
export class AnalyticsRealtimeController {
  constructor(private readonly realtimeService: AnalyticsRealtimeService) {}

  @Get('live-counters')
  @Roles('tenant_admin', 'manager', 'support_agent')
  @ApiOperation({ summary: 'Get live activity counters (active conversations, queued tickets)' })
  @ApiResponse({ status: 200, description: 'Live counters JSON object' })
  async getLiveCounters(@Headers('x-tenant-id') tenantId: string) {
    return this.realtimeService.getLiveCounters(tenantId);
  }

  @Get('live-sla')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get live SLA violation rates and risks' })
  @ApiResponse({ status: 200, description: 'Live SLA counters object' })
  async getLiveSla(@Headers('x-tenant-id') tenantId: string) {
    return this.realtimeService.getLiveSlaMetrics(tenantId);
  }

  @Get('live-ai')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Get live AI resolution and prompt/token rate metrics' })
  @ApiResponse({ status: 200, description: 'Live AI statistics object' })
  async getLiveAi(@Headers('x-tenant-id') tenantId: string) {
    return this.realtimeService.getLiveAiMetrics(tenantId);
  }
}
