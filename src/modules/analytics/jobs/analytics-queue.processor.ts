import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { AnalyticsEventConsumer } from '../consumers/analytics-event.consumer';
import { AnalyticsAggregationService } from '../services/analytics-aggregation.service';
import { AnalyticsReportService } from '../services/analytics-report.service';
import { AnalyticsExportService } from '../services/analytics-export.service';
import { db, schema } from '@easydev/database';
import { lte } from 'drizzle-orm';

@Processor('analytics-queue')
@Injectable()
export class AnalyticsQueueProcessor extends BaseWorker {
  constructor(
    private readonly eventConsumer: AnalyticsEventConsumer,
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly reportService: AnalyticsReportService,
    private readonly exportService: AnalyticsExportService,
    @Optional() queueService?: QueueService,
  ) {
    super('AnalyticsQueueProcessor', QUEUES.ANALYTICS, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'analytics-event-job':
        this.logger.log(
          `Processing analytics-event-job ${job.id} for event ${job.data.eventName}`,
        );
        await this.eventConsumer.handleEvent(job.data);
        return { success: true };

      case 'analytics-aggregation-job':
        this.logger.log(`Processing analytics-aggregation-job ${job.id}`);
        const timestamp = job.data.timestamp
          ? new Date(job.data.timestamp)
          : new Date();
        const type = job.data.type || 'hourly'; // hourly, daily, weekly, monthly

        if (type === 'hourly') {
          await this.aggregationService.aggregateHourly(tenantId, timestamp);
        } else if (type === 'daily') {
          await this.aggregationService.aggregateDaily(tenantId, timestamp);
        } else if (type === 'weekly') {
          await this.aggregationService.aggregateWeekly(tenantId, timestamp);
        } else if (type === 'monthly') {
          await this.aggregationService.aggregateMonthly(tenantId, timestamp);
        }
        return { success: true, type };

      case 'analytics-report-job':
        this.logger.log(
          `Processing analytics-report-job ${job.id} for report ${job.data.reportId}`,
        );
        await this.reportService.generateReportData(
          tenantId,
          job.data.reportId,
        );
        return { success: true };

      case 'analytics-export-job':
        this.logger.log(
          `Processing analytics-export-job ${job.id} for report ${job.data.reportId}`,
        );
        await this.exportService.triggerExport(tenantId, job.data);
        return { success: true };

      case 'analytics-cleanup-job':
        this.logger.log(`Processing analytics-cleanup-job ${job.id}`);
        const retentionDays = job.data.retentionDays || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        await db
          .delete(schema.analyticsEvents)
          .where(lte(schema.analyticsEvents.timestamp, cutoff));
        return { success: true, deletedBefore: cutoff.toISOString() };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
