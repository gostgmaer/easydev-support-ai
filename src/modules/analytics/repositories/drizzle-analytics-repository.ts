import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, gte, lte, between, desc } from 'drizzle-orm';
import { IAnalyticsRepository } from './analytics-repository.interface';
import {
  AnalyticsEvent,
  AnalyticsReport,
  AnalyticsMetric,
  AnalyticsSchedule,
} from '../domain/entities';

@Injectable()
export class DrizzleAnalyticsRepository implements IAnalyticsRepository {
  // ------------ Events ------------
  async saveEvent(event: AnalyticsEvent): Promise<void> {
    const raw = {
      id: event.id,
      tenantId: event.tenantId,
      eventName: event.eventName,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      userId: event.userId || null,
      timestamp: event.timestamp,
      payload: event.payload,
      metadata: event.metadata || {},
      createdAt: event.createdAt,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsEvents)
      .where(
        and(
          eq(schema.analyticsEvents.id, event.id),
          eq(schema.analyticsEvents.tenantId, event.tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsEvents)
        .set(raw)
        .where(
          and(
            eq(schema.analyticsEvents.id, event.id),
            eq(schema.analyticsEvents.tenantId, event.tenantId),
          ),
        );
    } else {
      await db.insert(schema.analyticsEvents).values(raw);
    }
  }

  async findEvents(
    tenantId: string,
    eventName?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<AnalyticsEvent[]> {
    const query = db
      .select()
      .from(schema.analyticsEvents)
      .where(eq(schema.analyticsEvents.tenantId, tenantId));

    const conditions = [eq(schema.analyticsEvents.tenantId, tenantId)];

    if (eventName) {
      conditions.push(eq(schema.analyticsEvents.eventName, eventName));
    }
    if (startTime) {
      conditions.push(gte(schema.analyticsEvents.timestamp, startTime));
    }
    if (endTime) {
      conditions.push(lte(schema.analyticsEvents.timestamp, endTime));
    }

    const rows = await db
      .select()
      .from(schema.analyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(schema.analyticsEvents.timestamp));

    return rows.map(
      (row) =>
        new AnalyticsEvent(row.id, {
          tenantId: row.tenantId,
          eventName: row.eventName,
          aggregateType: row.aggregateType,
          aggregateId: row.aggregateId,
          userId: row.userId || undefined,
          timestamp: row.timestamp,
          payload: row.payload as Record<string, any>,
          metadata: (row.metadata as Record<string, any>) || undefined,
          createdAt: row.createdAt,
        }),
    );
  }

  // ------------ Reports ------------
  async saveReport(report: AnalyticsReport): Promise<AnalyticsReport> {
    const raw = {
      id: report.id,
      tenantId: report.tenantId,
      name: report.name,
      description: report.description || null,
      reportType: report.reportType,
      timeRange: report.timeRange,
      filters: report.filters || {},
      parameters: report.parameters || {},
      data: report.data || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsReports)
      .where(
        and(
          eq(schema.analyticsReports.id, report.id),
          eq(schema.analyticsReports.tenantId, report.tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsReports)
        .set(raw)
        .where(
          and(
            eq(schema.analyticsReports.id, report.id),
            eq(schema.analyticsReports.tenantId, report.tenantId),
          ),
        );
    } else {
      await db.insert(schema.analyticsReports).values({
        ...raw,
        createdAt: report.createdAt,
      });
    }

    return report;
  }

  async getReportById(
    id: string,
    tenantId: string,
  ): Promise<AnalyticsReport | null> {
    const [row] = await db
      .select()
      .from(schema.analyticsReports)
      .where(
        and(
          eq(schema.analyticsReports.id, id),
          eq(schema.analyticsReports.tenantId, tenantId),
        ),
      );

    if (!row) return null;

    return new AnalyticsReport(row.id, {
      tenantId: row.tenantId,
      name: row.name,
      description: row.description || undefined,
      reportType: row.reportType,
      timeRange: row.timeRange,
      filters: (row.filters as Record<string, any>) || undefined,
      parameters: (row.parameters as Record<string, any>) || undefined,
      data: (row.data as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findReports(
    tenantId: string,
    reportType?: string,
  ): Promise<AnalyticsReport[]> {
    const conditions = [eq(schema.analyticsReports.tenantId, tenantId)];
    if (reportType) {
      conditions.push(eq(schema.analyticsReports.reportType, reportType));
    }

    const rows = await db
      .select()
      .from(schema.analyticsReports)
      .where(and(...conditions))
      .orderBy(desc(schema.analyticsReports.createdAt));

    return rows.map(
      (row) =>
        new AnalyticsReport(row.id, {
          tenantId: row.tenantId,
          name: row.name,
          description: row.description || undefined,
          reportType: row.reportType,
          timeRange: row.timeRange,
          filters: (row.filters as Record<string, any>) || undefined,
          parameters: (row.parameters as Record<string, any>) || undefined,
          data: (row.data as Record<string, any>) || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async deleteReport(id: string, tenantId: string): Promise<boolean> {
    const res = await db
      .delete(schema.analyticsReports)
      .where(
        and(
          eq(schema.analyticsReports.id, id),
          eq(schema.analyticsReports.tenantId, tenantId),
        ),
      );
    return true;
  }

  // ------------ Schedules ------------
  async saveSchedule(schedule: AnalyticsSchedule): Promise<AnalyticsSchedule> {
    const raw = {
      id: schedule.id,
      tenantId: schedule.tenantId,
      reportId: schedule.reportId,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      exportFormat: schedule.exportFormat,
      recipients: schedule.recipients,
      isActive: schedule.isActive,
      nextRunAt: schedule.nextRunAt || null,
      lastRunAt: schedule.lastRunAt || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsReportSchedules)
      .where(
        and(
          eq(schema.analyticsReportSchedules.id, schedule.id),
          eq(schema.analyticsReportSchedules.tenantId, schedule.tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsReportSchedules)
        .set(raw)
        .where(
          and(
            eq(schema.analyticsReportSchedules.id, schedule.id),
            eq(schema.analyticsReportSchedules.tenantId, schedule.tenantId),
          ),
        );
    } else {
      await db.insert(schema.analyticsReportSchedules).values({
        ...raw,
        createdAt: schedule.createdAt,
      });
    }

    return schedule;
  }

  async getScheduleById(
    id: string,
    tenantId: string,
  ): Promise<AnalyticsSchedule | null> {
    const [row] = await db
      .select()
      .from(schema.analyticsReportSchedules)
      .where(
        and(
          eq(schema.analyticsReportSchedules.id, id),
          eq(schema.analyticsReportSchedules.tenantId, tenantId),
        ),
      );

    if (!row) return null;

    return new AnalyticsSchedule(row.id, {
      tenantId: row.tenantId,
      reportId: row.reportId,
      name: row.name,
      cronExpression: row.cronExpression,
      timezone: row.timezone,
      exportFormat: row.exportFormat,
      recipients: row.recipients as string[],
      isActive: row.isActive,
      nextRunAt: row.nextRunAt || undefined,
      lastRunAt: row.lastRunAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findSchedules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<AnalyticsSchedule[]> {
    const conditions = [eq(schema.analyticsReportSchedules.tenantId, tenantId)];
    if (activeOnly) {
      conditions.push(eq(schema.analyticsReportSchedules.isActive, true));
    }

    const rows = await db
      .select()
      .from(schema.analyticsReportSchedules)
      .where(and(...conditions))
      .orderBy(desc(schema.analyticsReportSchedules.createdAt));

    return rows.map(
      (row) =>
        new AnalyticsSchedule(row.id, {
          tenantId: row.tenantId,
          reportId: row.reportId,
          name: row.name,
          cronExpression: row.cronExpression,
          timezone: row.timezone,
          exportFormat: row.exportFormat,
          recipients: row.recipients as string[],
          isActive: row.isActive,
          nextRunAt: row.nextRunAt || undefined,
          lastRunAt: row.lastRunAt || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async deleteSchedule(id: string, tenantId: string): Promise<boolean> {
    await db
      .delete(schema.analyticsReportSchedules)
      .where(
        and(
          eq(schema.analyticsReportSchedules.id, id),
          eq(schema.analyticsReportSchedules.tenantId, tenantId),
        ),
      );
    return true;
  }

  async findSchedulesToRun(now: Date): Promise<AnalyticsSchedule[]> {
    const rows = await db
      .select()
      .from(schema.analyticsReportSchedules)
      .where(
        and(
          eq(schema.analyticsReportSchedules.isActive, true),
          lte(schema.analyticsReportSchedules.nextRunAt, now),
        ),
      );

    return rows.map(
      (row) =>
        new AnalyticsSchedule(row.id, {
          tenantId: row.tenantId,
          reportId: row.reportId,
          name: row.name,
          cronExpression: row.cronExpression,
          timezone: row.timezone,
          exportFormat: row.exportFormat,
          recipients: row.recipients as string[],
          isActive: row.isActive,
          nextRunAt: row.nextRunAt || undefined,
          lastRunAt: row.lastRunAt || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  // ------------ Hourly / Daily Aggregated Metrics ------------
  async saveHourlyMetric(metric: AnalyticsMetric): Promise<void> {
    const raw = {
      id: metric.id,
      tenantId: metric.tenantId,
      metricType: metric.metricType,
      timestamp: metric.timestamp,
      value: String(metric.value),
      dimensions: metric.dimensions || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsHourlyMetrics)
      .where(
        and(
          eq(schema.analyticsHourlyMetrics.tenantId, metric.tenantId),
          eq(schema.analyticsHourlyMetrics.metricType, metric.metricType),
          eq(schema.analyticsHourlyMetrics.timestamp, metric.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsHourlyMetrics)
        .set(raw)
        .where(eq(schema.analyticsHourlyMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsHourlyMetrics).values({
        ...raw,
        createdAt: metric.createdAt,
      });
    }
  }

  async saveDailyMetric(metric: AnalyticsMetric): Promise<void> {
    const raw = {
      id: metric.id,
      tenantId: metric.tenantId,
      metricType: metric.metricType,
      timestamp: metric.timestamp,
      value: String(metric.value),
      dimensions: metric.dimensions || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsDailyMetrics)
      .where(
        and(
          eq(schema.analyticsDailyMetrics.tenantId, metric.tenantId),
          eq(schema.analyticsDailyMetrics.metricType, metric.metricType),
          eq(schema.analyticsDailyMetrics.timestamp, metric.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsDailyMetrics)
        .set(raw)
        .where(eq(schema.analyticsDailyMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsDailyMetrics).values({
        ...raw,
        createdAt: metric.createdAt,
      });
    }
  }

  async getHourlyMetrics(
    tenantId: string,
    metricType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<AnalyticsMetric[]> {
    const rows = await db
      .select()
      .from(schema.analyticsHourlyMetrics)
      .where(
        and(
          eq(schema.analyticsHourlyMetrics.tenantId, tenantId),
          eq(schema.analyticsHourlyMetrics.metricType, metricType),
          between(schema.analyticsHourlyMetrics.timestamp, startTime, endTime),
        ),
      );

    return rows.map(
      (row) =>
        new AnalyticsMetric(row.id, {
          tenantId: row.tenantId,
          metricType: row.metricType,
          timestamp: row.timestamp,
          value: Number(row.value),
          dimensions: (row.dimensions as Record<string, any>) || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async getDailyMetrics(
    tenantId: string,
    metricType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<AnalyticsMetric[]> {
    const rows = await db
      .select()
      .from(schema.analyticsDailyMetrics)
      .where(
        and(
          eq(schema.analyticsDailyMetrics.tenantId, tenantId),
          eq(schema.analyticsDailyMetrics.metricType, metricType),
          between(schema.analyticsDailyMetrics.timestamp, startTime, endTime),
        ),
      );

    return rows.map(
      (row) =>
        new AnalyticsMetric(row.id, {
          tenantId: row.tenantId,
          metricType: row.metricType,
          timestamp: row.timestamp,
          value: Number(row.value),
          dimensions: (row.dimensions as Record<string, any>) || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  // ------------ Tenant Metrics ------------
  async saveTenantMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      timestamp: metrics.timestamp,
      conversationsCount: metrics.conversationsCount || 0,
      messagesCount: metrics.messagesCount || 0,
      ticketsCount: metrics.ticketsCount || 0,
      resolvedTicketsCount: metrics.resolvedTicketsCount || 0,
      averageResponseTime: String(metrics.averageResponseTime || 0),
      averageResolutionTime: String(metrics.averageResolutionTime || 0),
      csatScore: String(metrics.csatScore || 0),
      slaViolationRate: String(metrics.slaViolationRate || 0),
      estimatedCostSavings: String(metrics.estimatedCostSavings || 0),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsTenantMetrics)
      .where(
        and(
          eq(schema.analyticsTenantMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsTenantMetrics.timestamp, metrics.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsTenantMetrics)
        .set(raw)
        .where(eq(schema.analyticsTenantMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsTenantMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getTenantMetrics(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsTenantMetrics)
      .where(
        and(
          eq(schema.analyticsTenantMetrics.tenantId, tenantId),
          between(schema.analyticsTenantMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  // ------------ Agent Metrics ------------
  async saveAgentMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      agentId: metrics.agentId,
      timestamp: metrics.timestamp,
      assignedConversations: metrics.assignedConversations || 0,
      resolvedConversations: metrics.resolvedConversations || 0,
      assignedTickets: metrics.assignedTickets || 0,
      resolvedTickets: metrics.resolvedTickets || 0,
      averageResponseTime: String(metrics.averageResponseTime || 0),
      averageResolutionTime: String(metrics.averageResolutionTime || 0),
      csatScore: String(metrics.csatScore || 0),
      workload: metrics.workload || 0,
      utilization: String(metrics.utilization || 0),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsAgentMetrics)
      .where(
        and(
          eq(schema.analyticsAgentMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsAgentMetrics.agentId, metrics.agentId),
          eq(schema.analyticsAgentMetrics.timestamp, metrics.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsAgentMetrics)
        .set(raw)
        .where(eq(schema.analyticsAgentMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsAgentMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getAgentMetrics(
    tenantId: string,
    agentId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsAgentMetrics)
      .where(
        and(
          eq(schema.analyticsAgentMetrics.tenantId, tenantId),
          eq(schema.analyticsAgentMetrics.agentId, agentId),
          between(schema.analyticsAgentMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  async getAgentMetricsSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsAgentMetrics)
      .where(
        and(
          eq(schema.analyticsAgentMetrics.tenantId, tenantId),
          between(schema.analyticsAgentMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  // ------------ Channel Metrics ------------
  async saveChannelMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      channelId: metrics.channelId,
      channelType: metrics.channelType,
      timestamp: metrics.timestamp,
      messageCount: metrics.messageCount || 0,
      conversationCount: metrics.conversationCount || 0,
      responseTime: String(metrics.responseTime || 0),
      deliverySuccessRate: String(metrics.deliverySuccessRate || 0),
      failureRate: String(metrics.failureRate || 0),
      usageVolume: metrics.usageVolume || 0,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsChannelMetrics)
      .where(
        and(
          eq(schema.analyticsChannelMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsChannelMetrics.channelId, metrics.channelId),
          eq(schema.analyticsChannelMetrics.timestamp, metrics.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsChannelMetrics)
        .set(raw)
        .where(eq(schema.analyticsChannelMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsChannelMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getChannelMetrics(
    tenantId: string,
    channelId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsChannelMetrics)
      .where(
        and(
          eq(schema.analyticsChannelMetrics.tenantId, tenantId),
          eq(schema.analyticsChannelMetrics.channelId, channelId),
          between(schema.analyticsChannelMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  async getChannelMetricsSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsChannelMetrics)
      .where(
        and(
          eq(schema.analyticsChannelMetrics.tenantId, tenantId),
          between(schema.analyticsChannelMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  // ------------ AI Metrics ------------
  async saveAiMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      timestamp: metrics.timestamp,
      aiRequests: metrics.aiRequests || 0,
      tokensUsed: metrics.tokensUsed || 0,
      promptTokens: metrics.promptTokens || 0,
      completionTokens: metrics.completionTokens || 0,
      estimatedCost: String(metrics.estimatedCost || 0),
      responseTime: String(metrics.responseTime || 0),
      escalationRate: String(metrics.escalationRate || 0),
      aiResolutionRate: String(metrics.aiResolutionRate || 0),
      humanResolutionRate: String(metrics.humanResolutionRate || 0),
      workflowExecutions: metrics.workflowExecutions || 0,
      toolCalls: metrics.toolCalls || 0,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsAiMetrics)
      .where(
        and(
          eq(schema.analyticsAiMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsAiMetrics.timestamp, metrics.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsAiMetrics)
        .set(raw)
        .where(eq(schema.analyticsAiMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsAiMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getAiMetrics(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsAiMetrics)
      .where(
        and(
          eq(schema.analyticsAiMetrics.tenantId, tenantId),
          between(schema.analyticsAiMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  // ------------ Ticket Metrics ------------
  async saveTicketMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      timestamp: metrics.timestamp,
      status: metrics.status || 'OPEN',
      priority: metrics.priority || 'MEDIUM',
      ticketCount: metrics.ticketCount || 0,
      responseTime: String(metrics.responseTime || 0),
      resolutionTime: String(metrics.resolutionTime || 0),
      slaViolationsCount: metrics.slaViolationsCount || 0,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsTicketMetrics)
      .where(
        and(
          eq(schema.analyticsTicketMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsTicketMetrics.timestamp, metrics.timestamp),
          eq(schema.analyticsTicketMetrics.status, metrics.status),
          eq(schema.analyticsTicketMetrics.priority, metrics.priority),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsTicketMetrics)
        .set(raw)
        .where(eq(schema.analyticsTicketMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsTicketMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getTicketMetrics(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsTicketMetrics)
      .where(
        and(
          eq(schema.analyticsTicketMetrics.tenantId, tenantId),
          between(schema.analyticsTicketMetrics.timestamp, startTime, endTime),
        ),
      );
  }

  // ------------ Workflow Metrics ------------
  async saveWorkflowMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      workflowId: metrics.workflowId,
      timestamp: metrics.timestamp,
      executionCount: metrics.executionCount || 0,
      successCount: metrics.successCount || 0,
      failureCount: metrics.failureCount || 0,
      averageDuration: String(metrics.averageDuration || 0),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsWorkflowMetrics)
      .where(
        and(
          eq(schema.analyticsWorkflowMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsWorkflowMetrics.workflowId, metrics.workflowId),
          eq(schema.analyticsWorkflowMetrics.timestamp, metrics.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsWorkflowMetrics)
        .set(raw)
        .where(eq(schema.analyticsWorkflowMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsWorkflowMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getWorkflowMetrics(
    tenantId: string,
    workflowId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsWorkflowMetrics)
      .where(
        and(
          eq(schema.analyticsWorkflowMetrics.tenantId, tenantId),
          eq(schema.analyticsWorkflowMetrics.workflowId, workflowId),
          between(
            schema.analyticsWorkflowMetrics.timestamp,
            startTime,
            endTime,
          ),
        ),
      );
  }

  async getWorkflowMetricsSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsWorkflowMetrics)
      .where(
        and(
          eq(schema.analyticsWorkflowMetrics.tenantId, tenantId),
          between(
            schema.analyticsWorkflowMetrics.timestamp,
            startTime,
            endTime,
          ),
        ),
      );
  }

  // ------------ Customer Metrics ------------
  async saveCustomerMetrics(metrics: any): Promise<void> {
    const raw = {
      tenantId: metrics.tenantId,
      customerId: metrics.customerId,
      timestamp: metrics.timestamp,
      lifetimeValue: String(metrics.lifetimeValue || 0),
      conversationCount: metrics.conversationCount || 0,
      ticketCount: metrics.ticketCount || 0,
      sentimentScore: String(metrics.sentimentScore || 0),
      retentionScore: String(metrics.retentionScore || 0),
      riskScore: String(metrics.riskScore || 0),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.analyticsCustomerMetrics)
      .where(
        and(
          eq(schema.analyticsCustomerMetrics.tenantId, metrics.tenantId),
          eq(schema.analyticsCustomerMetrics.customerId, metrics.customerId),
          eq(schema.analyticsCustomerMetrics.timestamp, metrics.timestamp),
        ),
      );

    if (existing) {
      await db
        .update(schema.analyticsCustomerMetrics)
        .set(raw)
        .where(eq(schema.analyticsCustomerMetrics.id, existing.id));
    } else {
      await db.insert(schema.analyticsCustomerMetrics).values({
        ...raw,
        createdAt: new Date(),
      });
    }
  }

  async getCustomerMetrics(
    tenantId: string,
    customerId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    return db
      .select()
      .from(schema.analyticsCustomerMetrics)
      .where(
        and(
          eq(schema.analyticsCustomerMetrics.tenantId, tenantId),
          eq(schema.analyticsCustomerMetrics.customerId, customerId),
          between(
            schema.analyticsCustomerMetrics.timestamp,
            startTime,
            endTime,
          ),
        ),
      );
  }
}
