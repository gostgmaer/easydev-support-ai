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

      case 'audit-event':
        // Durable record is already written synchronously by AuditService.log()
        // via AuditRepository; this queue hop exists only so other consumers
        // could observe audit activity. Acknowledge rather than throw.
        this.logger.debug(
          `Audit event acknowledged: ${job.data.action} (tenant ${tenantId})`,
        );
        return { success: true };

      case 'admin-event':
        // Same shape as audit-event: AdminEventPublisher already persisted the
        // underlying admin-module change via its own service; this queue hop
        // exists only so other consumers could observe it. Acknowledge rather
        // than throw.
        this.logger.debug(
          `Admin event acknowledged: ${job.data.eventName} (aggregate ${job.data.aggregateId})`,
        );
        return { success: true };

      case 'ticket-event':
        this.logger.log(
          `Processing ticket-event ${job.id} for event ${job.data.eventName}`,
        );
        await this.eventConsumer.handleEvent({
          tenantId,
          eventName: job.data.eventName,
          aggregateType: 'Ticket',
          aggregateId: job.data.ticketId,
          timestamp: new Date().toISOString(),
          payload: {},
        });
        return { success: true };

      case 'conversation-event':
        this.logger.log(
          `Processing conversation-event ${job.id} for event ${job.data.eventName}`,
        );
        await this.eventConsumer.handleEvent({
          tenantId,
          eventName: job.data.eventName,
          aggregateType: 'Conversation',
          aggregateId: job.data.conversationId,
          timestamp: new Date().toISOString(),
          payload: {},
        });
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
        // Many independent publishers feed this queue (tickets, conversations,
        // messages, notifications, inbox, widget, help-center, tenant
        // lifecycle...) without a shared job-name registry, and most of them
        // have no aggregation handler implemented yet on this side. Throwing
        // here causes BullMQ to retry forever and spam logs for job types that
        // were never going to succeed. Acknowledge so the queue drains, but
        // warn loudly since this means that event's metrics are NOT being
        // aggregated - see analytics module follow-up work.
        this.logger.warn(
          `No aggregation handler implemented for job name "${job.name}" - acknowledging without processing (tenant ${tenantId})`,
        );
        return { success: true, acknowledged: true, unhandled: job.name };
    }
  }
}
