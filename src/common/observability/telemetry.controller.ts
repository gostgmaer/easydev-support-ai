import { Body, Controller, Post } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsEventService } from '../../modules/analytics/services/analytics-event.service';

/**
 * Event shape sent by @easydev/observability's TelemetryClient (packages/observability
 * in easydev-support-ai-web) - error/performance/user_action/agent_action/etc, enriched
 * client-side with app/tenantId/userId/sessionId/traceId/correlationId/timestamp.
 */
interface ClientTelemetryEvent {
  type: string;
  app?: string;
  tenantId?: string | null;
  userId?: string | null;
  timestamp: string;
  [key: string]: unknown;
}

const TELEMETRY_AGGREGATE_TYPE = 'observability_telemetry';

/**
 * No guard here, deliberately: TelemetryClient.flushSync() prefers navigator.sendBeacon,
 * which cannot attach custom headers at all (no Authorization, no X-Tenant-Id) - every
 * event already carries its own tenantId/userId baked in client-side via identify(), so
 * this endpoint reads tenant context from the body instead of from TenantGuard/TenantOnlyGuard.
 * Events with no tenantId (not yet identified, or a fully anonymous page) are accepted but
 * dropped rather than rejected - same best-effort semantics already documented client-side.
 */
@Controller('v1/observability')
export class TelemetryController {
  constructor(private readonly eventService: AnalyticsEventService) {}

  @Post('telemetry')
  async ingestTelemetry(@Body() body: { events?: ClientTelemetryEvent[] }) {
    const events = body?.events ?? [];
    let accepted = 0;
    for (const event of events) {
      if (!event.tenantId) continue;
      await this.eventService.trackEvent(
        event.tenantId,
        event.type,
        TELEMETRY_AGGREGATE_TYPE,
        uuidv4(),
        event,
        event.userId ?? undefined,
      );
      accepted += 1;
    }
    return { accepted, received: events.length };
  }
}
