import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent as TypeOrmAnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsEventService } from './services/analytics-event.service';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(TypeOrmAnalyticsEvent)
    private analyticsRepo: Repository<TypeOrmAnalyticsEvent>,
    private readonly eventService: AnalyticsEventService,
    private readonly dashboardService: AnalyticsDashboardService,
  ) {}

  async trackEvent(tenantId: string, eventType: string, payload: any) {
    // 1. Maintain compatibility with TypeORM Entity saving
    const typeOrmEvent = this.analyticsRepo.create({
      tenantId,
      eventType,
      payload,
    });
    await this.analyticsRepo.save(typeOrmEvent);

    // 2. Route to our production-ready event-driven Domain engine
    await this.eventService.trackEvent(
      tenantId,
      eventType,
      'Generic',
      typeOrmEvent.id || 'legacy-id',
      payload,
    );
  }

  async getExecutiveOverview(tenantId: string) {
    this.logger.debug(`Generating executive overview for ${tenantId}`);
    const metrics = await this.dashboardService.getDashboardMetrics(
      tenantId,
      'Last 30 Days',
    );
    return {
      activeConversations: metrics.conversationsCount || 0,
      aiResolutionRate: metrics.aiResolutionRate || 0,
      openTickets: metrics.ticketsCount || 0,
      slaBreaches:
        Math.floor(
          metrics.conversationsCount * (metrics.slaViolationRate / 100),
        ) || 0,
    };
  }
}
