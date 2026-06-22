import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// TypeORM Entities for compatibility
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { CsatSurvey } from './entities/csat-survey.entity';

// Controllers
import { AnalyticsController } from './analytics.controller';
import { AnalyticsDashboardController } from './controllers/analytics-dashboard.controller';
import { AnalyticsReportController } from './controllers/analytics-report.controller';
import { AnalyticsExportController } from './controllers/analytics-export.controller';
import { AnalyticsRealtimeController } from './controllers/analytics-realtime.controller';

// Services
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventService } from './services/analytics-event.service';
import { AnalyticsAggregationService } from './services/analytics-aggregation.service';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';
import { AnalyticsReportService } from './services/analytics-report.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { AnalyticsScheduleService } from './services/analytics-schedule.service';
import { AnalyticsRealtimeService } from './services/analytics-realtime.service';
import { AnalyticsCronService } from './services/analytics-cron.service';
import { CsatSurveyService } from './services/csat-survey.service';

// Repositories
import { DrizzleAnalyticsRepository } from './repositories/drizzle-analytics-repository';

// Consumers
import { AnalyticsEventConsumer } from './consumers/analytics-event.consumer';

// Jobs
import { AnalyticsQueueProcessor } from './jobs/analytics-queue.processor';

// External Modules
import { NotificationsModule } from '../notifications/notifications.module';
import { IntegrationModule } from '../../integration/integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, CsatSurvey]),
    BullModule.registerQueue({
      name: 'analytics-queue',
    }),
    NotificationsModule,
    IntegrationModule,
  ],
  controllers: [
    AnalyticsController,
    AnalyticsDashboardController,
    AnalyticsReportController,
    AnalyticsExportController,
    AnalyticsRealtimeController,
  ],
  providers: [
    {
      provide: 'IAnalyticsRepository',
      useClass: DrizzleAnalyticsRepository,
    },
    AnalyticsService,
    AnalyticsEventService,
    AnalyticsAggregationService,
    AnalyticsDashboardService,
    AnalyticsReportService,
    AnalyticsExportService,
    AnalyticsScheduleService,
    AnalyticsRealtimeService,
    AnalyticsCronService,
    AnalyticsEventConsumer,
    AnalyticsQueueProcessor,
    CsatSurveyService,
  ],
  exports: [
    AnalyticsService,
    AnalyticsEventService,
    AnalyticsAggregationService,
    AnalyticsDashboardService,
    AnalyticsReportService,
    AnalyticsExportService,
    AnalyticsScheduleService,
    AnalyticsRealtimeService,
    CsatSurveyService,
    'IAnalyticsRepository',
  ],
})
export class AnalyticsModule {}
