import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantOnlyGuard } from '../../common/guards/tenant-only.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventService } from './services/analytics-event.service';

/** Client telemetry event shape sent by the frontend's @easydev/analytics HttpSink
 * (page_view, event, feature_usage, error, performance) — see packages/types/src/analytics.ts
 * in easydev-support-ai-web. These have no natural domain aggregate, so each gets a
 * freshly generated aggregateId purely to satisfy analytics_events' NOT NULL constraint. */
interface ClientTelemetryEvent {
  type: string;
  name?: string;
  timestamp: string;
  [key: string]: unknown;
}

const TELEMETRY_AGGREGATE_TYPE = 'frontend_telemetry';

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly eventService: AnalyticsEventService,
  ) {}

  @Get('overview')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin', 'manager')
  async getOverview(@Headers('x-tenant-id') tenantId: string) {
    return this.analyticsService.getExecutiveOverview(tenantId);
  }

  // Client telemetry fires from every app, authenticated or not (the Customer
  // Widget and Help Center never hold an IAM session at all) - see
  // TenantOnlyGuard's doc comment. req.user is simply absent for anonymous
  // callers, so the event is recorded with no userId, which trackEvent allows.
  @Post('events')
  @UseGuards(TenantOnlyGuard)
  async ingestEvents(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { events?: ClientTelemetryEvent[] },
    @Req() req: any,
  ) {
    const events = body?.events ?? [];
    for (const event of events) {
      const eventName = event.type === 'event' && typeof event.name === 'string' ? event.name : event.type;
      await this.eventService.trackEvent(
        tenantId,
        eventName,
        TELEMETRY_AGGREGATE_TYPE,
        uuidv4(),
        event,
        req.user?.id,
      );
    }
    return { accepted: events.length };
  }
}
