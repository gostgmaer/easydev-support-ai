import {
  AnalyticsEvent,
  AnalyticsReport,
  AnalyticsMetric,
  AnalyticsSchedule,
} from '../domain/entities';

export interface IAnalyticsRepository {
  // Events
  saveEvent(event: AnalyticsEvent): Promise<void>;
  findEvents(
    tenantId: string,
    eventName?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<AnalyticsEvent[]>;

  // Reports
  saveReport(report: AnalyticsReport): Promise<AnalyticsReport>;
  getReportById(id: string, tenantId: string): Promise<AnalyticsReport | null>;
  findReports(
    tenantId: string,
    reportType?: string,
  ): Promise<AnalyticsReport[]>;
  deleteReport(id: string, tenantId: string): Promise<boolean>;

  // Schedules
  saveSchedule(schedule: AnalyticsSchedule): Promise<AnalyticsSchedule>;
  getScheduleById(
    id: string,
    tenantId: string,
  ): Promise<AnalyticsSchedule | null>;
  findSchedules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<AnalyticsSchedule[]>;
  deleteSchedule(id: string, tenantId: string): Promise<boolean>;
  findSchedulesToRun(now: Date): Promise<AnalyticsSchedule[]>;

  // Hourly / Daily Aggregated Metrics
  saveHourlyMetric(metric: AnalyticsMetric): Promise<void>;
  saveDailyMetric(metric: AnalyticsMetric): Promise<void>;
  getHourlyMetrics(
    tenantId: string,
    metricType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<AnalyticsMetric[]>;
  getDailyMetrics(
    tenantId: string,
    metricType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<AnalyticsMetric[]>;

  // Tenant Metrics
  saveTenantMetrics(metrics: any): Promise<void>;
  getTenantMetrics(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;

  // Agent Metrics
  saveAgentMetrics(metrics: any): Promise<void>;
  getAgentMetrics(
    tenantId: string,
    agentId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;
  getAgentMetricsSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;

  // Channel Metrics
  saveChannelMetrics(metrics: any): Promise<void>;
  getChannelMetrics(
    tenantId: string,
    channelId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;
  getChannelMetricsSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;

  // AI Metrics
  saveAiMetrics(metrics: any): Promise<void>;
  getAiMetrics(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;

  // Ticket Metrics
  saveTicketMetrics(metrics: any): Promise<void>;
  getTicketMetrics(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;

  // Workflow Metrics
  saveWorkflowMetrics(metrics: any): Promise<void>;
  getWorkflowMetrics(
    tenantId: string,
    workflowId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;
  getWorkflowMetricsSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;

  // Customer Metrics
  saveCustomerMetrics(metrics: any): Promise<void>;
  getCustomerMetrics(
    tenantId: string,
    customerId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]>;
}
