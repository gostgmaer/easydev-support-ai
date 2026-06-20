import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsScheduleService } from './analytics-schedule.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(
    private readonly scheduleService: AnalyticsScheduleService,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly queueService: QueueService,
  ) {}

  // Run report schedule ticks every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async tickReportSchedules() {
    this.logger.debug('Running report schedule tick cron...');
    await this.scheduleService.tickSchedules(new Date());
  }

  // Trigger hourly/daily metrics aggregation jobs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async triggerAggregations() {
    this.logger.log('Triggering metric aggregations jobs...');
    // In production, we'd loop through all active tenants and enqueue their hourly/daily/weekly aggregation jobs.
    // For simplicity, we queue the aggregation job on the analytics-queue which handles it.
    await this.queueService.addJob(
      QUEUES.ANALYTICS,
      'analytics-aggregation-job',
      {
        type: 'hourly',
        timestamp: new Date().toISOString(),
      },
    );

    // If it's midnight, trigger daily aggregation
    const now = new Date();
    if (now.getHours() === 0) {
      await this.queueService.addJob(
        QUEUES.ANALYTICS,
        'analytics-aggregation-job',
        {
          type: 'daily',
          timestamp: new Date().toISOString(),
        },
      );
    }
  }

  // Trigger cleanup job daily at 2:00 AM
  @Cron('0 2 * * *')
  async triggerCleanup() {
    this.logger.log('Triggering database cleanup job...');
    await this.queueService.addJob(QUEUES.ANALYTICS, 'analytics-cleanup-job', {
      retentionDays: 30,
    });
  }
}
