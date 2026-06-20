import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsEventService } from '../services/analytics-event.service';
import { AnalyticsAggregationService } from '../services/analytics-aggregation.service';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { AnalyticsReportService } from '../services/analytics-report.service';
import { AnalyticsExportService } from '../services/analytics-export.service';
import { AnalyticsScheduleService } from '../services/analytics-schedule.service';
import { AnalyticsRealtimeService } from '../services/analytics-realtime.service';
import { AnalyticsCronService } from '../services/analytics-cron.service';
import { AnalyticsEventConsumer } from '../consumers/analytics-event.consumer';
import { AnalyticsQueueProcessor } from '../jobs/analytics-queue.processor';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { NotificationService } from '../../notifications/notification.service';
import { IamIntegrationService } from '../../../integration/iam/iam.service';
import { AnalyticsEvent, AnalyticsReport, AnalyticsMetric, AnalyticsSchedule } from '../domain/entities';
import {
  MetricId,
  ReportId,
  ScheduleId,
  MetricType,
  TimeRange,
} from '../domain/value-objects';
import { AnalyticsDashboardController } from '../controllers/analytics-dashboard.controller';
import { AnalyticsReportController } from '../controllers/analytics-report.controller';
import { AnalyticsExportController } from '../controllers/analytics-export.controller';
import { AnalyticsRealtimeController } from '../controllers/analytics-realtime.controller';
import { AnalyticsController } from '../analytics.controller';
import { Job } from 'bullmq';
import { Response } from 'express';
let mockRedisOnMessageCallback: (channel: string, message: string) => void;
const mockRedisPublish = jest.fn().mockResolvedValue(undefined);
const mockRedisSubscribe = jest.fn().mockResolvedValue(undefined);
const mockRedisQuit = jest.fn().mockResolvedValue(undefined);

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'message') {
          mockRedisOnMessageCallback = callback;
        }
      }),
      subscribe: mockRedisSubscribe,
      publish: mockRedisPublish,
      quit: mockRedisQuit,
    };
  });
});

jest.mock('@easydev/database', () => ({
  db: {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue({ success: true }),
  },
  schema: {
    analyticsEvents: {
      timestamp: 'timestamp',
    },
  },
}));

describe('Analytics Module - Comprehensive Tests', () => {
  let module: TestingModule;
  let analyticsService: AnalyticsService;
  let eventService: AnalyticsEventService;
  let aggregationService: AnalyticsAggregationService;
  let dashboardService: AnalyticsDashboardService;
  let reportService: AnalyticsReportService;
  let exportService: AnalyticsExportService;
  let scheduleService: AnalyticsScheduleService;
  let realtimeService: AnalyticsRealtimeService;
  let cronService: AnalyticsCronService;
  let eventConsumer: AnalyticsEventConsumer;
  let queueProcessor: AnalyticsQueueProcessor;

  const tenantId = '00000000-0000-0000-0000-000000000000';
  const reportId = 'report-uuid-1';
  const scheduleId = 'schedule-uuid-1';

  // Repository Mock
  const mockRepository: jest.Mocked<IAnalyticsRepository> = {
    saveEvent: jest.fn(),
    findEvents: jest.fn(),
    saveReport: jest.fn(),
    getReportById: jest.fn(),
    findReports: jest.fn(),
    deleteReport: jest.fn(),
    saveSchedule: jest.fn(),
    getScheduleById: jest.fn(),
    findSchedules: jest.fn(),
    deleteSchedule: jest.fn(),
    findSchedulesToRun: jest.fn(),
    saveHourlyMetric: jest.fn(),
    saveDailyMetric: jest.fn(),
    getHourlyMetrics: jest.fn(),
    getDailyMetrics: jest.fn(),
    saveTenantMetrics: jest.fn(),
    getTenantMetrics: jest.fn(),
    saveAgentMetrics: jest.fn(),
    getAgentMetrics: jest.fn(),
    getAgentMetricsSummary: jest.fn(),
    saveChannelMetrics: jest.fn(),
    getChannelMetrics: jest.fn(),
    getChannelMetricsSummary: jest.fn(),
    saveAiMetrics: jest.fn(),
    getAiMetrics: jest.fn(),
    saveTicketMetrics: jest.fn(),
    getTicketMetrics: jest.fn(),
    saveWorkflowMetrics: jest.fn(),
    getWorkflowMetrics: jest.fn(),
    getWorkflowMetricsSummary: jest.fn(),
    saveCustomerMetrics: jest.fn(),
    getCustomerMetrics: jest.fn(),
  };

  // QueueService Mock
  const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
    moveToDeadLetter: jest.fn().mockResolvedValue({ id: 'dlq-123' }),
  };

  // NotificationService Mock
  const mockNotificationService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
  };

  // IAM Service Mock
  const mockIamService = {
    validateTokenAndGetTenant: jest.fn().mockResolvedValue({ tenantId, userId: 'user-123' }),
    checkPermission: jest.fn().mockResolvedValue(true),
  };

  // TypeORM Repo Mock
  const mockTypeOrmRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'typeorm-id', ...dto })),
    save: jest.fn().mockResolvedValue({ id: 'typeorm-id' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepository.saveSchedule.mockImplementation(async (s) => s);
    mockRepository.saveReport.mockImplementation(async (r) => r);

    module = await Test.createTestingModule({
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
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AnalyticsEvent),
          useValue: mockTypeOrmRepo,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: IamIntegrationService,
          useValue: mockIamService,
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
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    eventService = module.get<AnalyticsEventService>(AnalyticsEventService);
    aggregationService = module.get<AnalyticsAggregationService>(AnalyticsAggregationService);
    dashboardService = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
    reportService = module.get<AnalyticsReportService>(AnalyticsReportService);
    exportService = module.get<AnalyticsExportService>(AnalyticsExportService);
    scheduleService = module.get<AnalyticsScheduleService>(AnalyticsScheduleService);
    realtimeService = module.get<AnalyticsRealtimeService>(AnalyticsRealtimeService);
    cronService = module.get<AnalyticsCronService>(AnalyticsCronService);
    eventConsumer = module.get<AnalyticsEventConsumer>(AnalyticsEventConsumer);
    queueProcessor = module.get<AnalyticsQueueProcessor>(AnalyticsQueueProcessor);
  });

  describe('Value Objects & Domain Model', () => {
    it('should validate MetricId', () => {
      const vo = MetricId.create('m-1');
      expect(vo.value).toBe('m-1');
      expect(() => MetricId.create('')).toThrow();
    });

    it('should validate ReportId', () => {
      const vo = ReportId.create('r-1');
      expect(vo.value).toBe('r-1');
      expect(() => ReportId.create('')).toThrow();
    });

    it('should validate ScheduleId', () => {
      const vo = ScheduleId.create('s-1');
      expect(vo.value).toBe('s-1');
      expect(() => ScheduleId.create('')).toThrow();
    });

    it('should validate MetricType', () => {
      const vo = MetricType.create('conversation.created');
      expect(vo.value).toBe('conversation.created');
      expect(() => MetricType.create('')).toThrow();
    });

    it('should validate TimeRange', () => {
      const start = new Date();
      const end = new Date(start.getTime() + 1000);
      const vo = TimeRange.create(start, end);
      expect(vo.startDate).toEqual(start);
      expect(vo.endDate).toEqual(end);
      expect(() => TimeRange.create(end, start)).toThrow();
    });

    it('should construct and update Report data', () => {
      const report = new AnalyticsReport(reportId, {
        tenantId,
        name: 'Daily AI',
        reportType: 'AI Reports',
        timeRange: 'Last 7 Days',
      });
      expect(report.name).toBe('Daily AI');
      report.updateData({ value: 100 });
      expect(report.data).toEqual({ value: 100 });
    });

    it('should toggle and run Schedule', () => {
      const schedule = new AnalyticsSchedule(scheduleId, {
        tenantId,
        reportId,
        name: 'Weekly Export',
        cronExpression: '0 0 * * 0',
        timezone: 'UTC',
        exportFormat: 'CSV',
        recipients: ['test@test.com'],
        isActive: true,
      });
      expect(schedule.isActive).toBe(true);
      schedule.toggle(false);
      expect(schedule.isActive).toBe(false);
      const nextRun = new Date();
      schedule.updateRun(nextRun);
      expect(schedule.nextRunAt).toEqual(nextRun);
    });
  });

  describe('AnalyticsEventService & AnalyticsService', () => {
    it('should save and track domain events, enqueuing them to BullMQ', async () => {
      const event = await eventService.trackEvent(
        tenantId,
        'conversation.created',
        'Conversation',
        'conv-1',
        { customerId: 'cust-1' },
      );
      expect(event.eventName).toBe('conversation.created');
      expect(mockRepository.saveEvent).toHaveBeenCalled();
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        QUEUES.ANALYTICS,
        'analytics-event-job',
        expect.any(Object),
      );
    });

    it('should support legacy tracking and executive summaries', async () => {
      mockRepository.getTenantMetrics.mockResolvedValue([
        {
          conversationsCount: 10,
          messagesCount: 50,
          ticketsCount: 5,
          resolvedTicketsCount: 3,
          averageResponseTime: '120',
          averageResolutionTime: '600',
          csatScore: '4.8',
          slaViolationRate: '10',
          estimatedCostSavings: '300',
        },
      ]);

      await analyticsService.trackEvent(tenantId, 'message.sent', { text: 'hi' });
      expect(mockTypeOrmRepo.save).toHaveBeenCalled();

      const overview = await analyticsService.getExecutiveOverview(tenantId);
      expect(overview.activeConversations).toBe(10);
      expect(overview.openTickets).toBe(5);
    });
  });

  describe('AnalyticsAggregationService', () => {
    it('should process events and compile metrics', async () => {
      const sampleEvents = [
        { name: 'conversation.created', payload: { channelId: 'chan-1', channelType: 'WEB' } },
        { name: 'conversation.closed', payload: { resolutionTime: 300, isSlaViolated: false } },
        { name: 'message.sent', payload: { channelId: 'chan-1' } },
        { name: 'ticket.created', payload: { status: 'OPEN', priority: 'HIGH' } },
        { name: 'ticket.closed', payload: { resolutionTime: 500 } },
        { name: 'ai.workflow.completed', payload: { tokensUsed: 100, promptTokens: 50, completionTokens: 50, estimatedCost: 0.05, isResolved: true } },
        { name: 'workflow.execution.completed', payload: { workflowId: 'wf-1', status: 'COMPLETED', executionTimeMs: 120 } },
        { name: 'customer.created', payload: { email: 'test@t.com' } },
      ];

      for (const ev of sampleEvents) {
        await aggregationService.processEvent({
          tenantId,
          eventName: ev.name,
          aggregateType: 'Test',
          aggregateId: 'id-1',
          timestamp: new Date().toISOString(),
          payload: ev.payload,
        });
      }

      expect(mockRepository.saveTenantMetrics).toHaveBeenCalled();
      expect(mockRepository.saveChannelMetrics).toHaveBeenCalled();
      expect(mockRepository.saveAgentMetrics).toHaveBeenCalled();
      expect(mockRepository.saveAiMetrics).toHaveBeenCalled();
      expect(mockRepository.saveWorkflowMetrics).toHaveBeenCalled();
      expect(mockRepository.saveCustomerMetrics).toHaveBeenCalled();
      expect(mockRepository.saveHourlyMetric).toHaveBeenCalled();
    });

    it('should aggregate hourly, daily, weekly, monthly metric rollups', async () => {
      mockRepository.findEvents.mockResolvedValue([
        AnalyticsEvent.create('ev-1', {
          tenantId,
          eventName: 'conversation.created',
          aggregateType: 'Conversation',
          aggregateId: 'c-1',
          timestamp: new Date(),
          payload: {},
        }),
      ]);

      mockRepository.getHourlyMetrics.mockResolvedValue([
        new AnalyticsMetric('m-1', {
          tenantId,
          metricType: 'conversation.created',
          timestamp: new Date(),
          value: 10,
        }),
      ]);

      mockRepository.getDailyMetrics.mockResolvedValue([
        new AnalyticsMetric('m-2', {
          tenantId,
          metricType: 'conversation.created',
          timestamp: new Date(),
          value: 70,
        }),
      ]);

      await aggregationService.aggregateHourly(tenantId, new Date());
      await aggregationService.aggregateDaily(tenantId, new Date());
      await aggregationService.aggregateWeekly(tenantId, new Date());
      await aggregationService.aggregateMonthly(tenantId, new Date());

      expect(mockRepository.saveHourlyMetric).toHaveBeenCalled();
      expect(mockRepository.saveDailyMetric).toHaveBeenCalled();
    });
  });

  describe('AnalyticsDashboardService', () => {
    it('should retrieve dashboard calculations', async () => {
      mockRepository.getTenantMetrics.mockResolvedValue([
        {
          conversationsCount: 5,
          messagesCount: 15,
          ticketsCount: 2,
          resolvedTicketsCount: 1,
          averageResponseTime: '80',
          averageResolutionTime: '300',
          csatScore: '4.5',
          slaViolationRate: '0',
          estimatedCostSavings: '150',
        },
      ]);

      const metrics = await dashboardService.getDashboardMetrics(tenantId, 'Last 7 Days');
      expect(metrics.conversationsCount).toBe(5);
      expect(metrics.averageResponseTime).toBe(80);
    });

    it('should fetch agent, channel, AI and custom dashboard values', async () => {
      mockRepository.getAiMetrics.mockResolvedValue([
        {
          aiRequests: 10,
          tokensUsed: 1000,
          promptTokens: 600,
          completionTokens: 400,
          estimatedCost: '0.2',
          responseTime: '200',
          escalationRate: '10',
          aiResolutionRate: '90',
          humanResolutionRate: '10',
          workflowExecutions: 5,
          toolCalls: 12,
        },
      ]);

      const aiMetrics = await dashboardService.getAiDashboardMetrics(tenantId, 'Last 24 Hours');
      expect(aiMetrics.aiRequests).toBe(10);
      expect(aiMetrics.tokensUsed).toBe(1000);

      await dashboardService.getAgentDashboardMetrics(tenantId, 'agent-1', 'Last 7 Days');
      await dashboardService.getAgentSummaryMetrics(tenantId, 'Last 7 Days');
      await dashboardService.getChannelDashboardMetrics(tenantId, 'chan-1', 'Last 7 Days');
      await dashboardService.getChannelSummaryMetrics(tenantId, 'Last 7 Days');
      await dashboardService.getCustomMetrics(tenantId, 'test-m', new Date(), new Date());

      expect(mockRepository.getAgentMetrics).toHaveBeenCalled();
      expect(mockRepository.getAgentMetricsSummary).toHaveBeenCalled();
      expect(mockRepository.getChannelMetrics).toHaveBeenCalled();
      expect(mockRepository.getChannelMetricsSummary).toHaveBeenCalled();
      expect(mockRepository.getDailyMetrics).toHaveBeenCalled();
    });
  });

  describe('AnalyticsReportService', () => {
    it('should support Report CRUD and generation', async () => {
      const mockReport = new AnalyticsReport(reportId, {
        tenantId,
        name: 'Report A',
        reportType: 'Tenant Reports',
        timeRange: 'Last 30 Days',
      });
      mockRepository.getReportById.mockResolvedValue(mockReport);
      mockRepository.findReports.mockResolvedValue([mockReport]);

      const report = await reportService.createReport(tenantId, {
        name: 'Report A',
        reportType: 'Tenant Reports',
        timeRange: 'Last 30 Days',
      });
      expect(report.name).toBe('Report A');

      await reportService.getReport(tenantId, reportId);
      await reportService.findReports(tenantId);
      await reportService.updateReport(tenantId, reportId, { name: 'Updated name' });
      await reportService.deleteReport(tenantId, reportId);

      expect(mockRepository.saveReport).toHaveBeenCalled();
      expect(mockRepository.deleteReport).toHaveBeenCalled();
    });
  });

  describe('AnalyticsExportService', () => {
    it('should support manual and scheduled exports, converting formats and sending notifications', async () => {
      const mockReport = new AnalyticsReport(reportId, {
        tenantId,
        name: 'Report Export',
        reportType: 'AI Reports',
        timeRange: 'Last 7 Days',
        data: { cost: 10, totalRequests: 50 },
      });
      mockRepository.getReportById.mockResolvedValue(mockReport);

      const formats = ['CSV', 'EXCEL', 'PDF', 'JSON'];
      for (const fmt of formats) {
        const result = await exportService.generateExport(tenantId, reportId, fmt);
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.filename).toBeDefined();
      }

      await exportService.triggerExport(tenantId, {
        reportId,
        format: 'CSV',
        recipients: ['recipient@test.com'],
      });

      expect(mockNotificationService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('AnalyticsScheduleService & AnalyticsCronService', () => {
    it('should create, list, and process schedules and schedules ticks', async () => {
      const mockSchedule = new AnalyticsSchedule(scheduleId, {
        tenantId,
        reportId,
        name: 'Daily AI',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        exportFormat: 'CSV',
        recipients: ['test@t.com'],
        isActive: true,
      });

      mockRepository.getScheduleById.mockResolvedValue(mockSchedule);
      mockRepository.findSchedules.mockResolvedValue([mockSchedule]);
      mockRepository.findSchedulesToRun.mockResolvedValue([mockSchedule]);

      const schedule = await scheduleService.createSchedule(tenantId, {
        reportId,
        name: 'Daily AI',
        cronExpression: '0 0 * * *',
        exportFormat: 'CSV',
        recipients: ['test@t.com'],
      });
      expect(schedule.name).toBe('Daily AI');

      await scheduleService.findSchedules(tenantId);
      await scheduleService.updateSchedule(tenantId, scheduleId, { name: 'New Schedule name' });
      await scheduleService.tickSchedules(new Date());
      await scheduleService.deleteSchedule(tenantId, scheduleId);

      expect(mockRepository.saveSchedule).toHaveBeenCalled();
      expect(mockRepository.deleteSchedule).toHaveBeenCalled();
    });

    it('should run cron jobs to tick report schedules and trigger aggregation queue tasks', async () => {
      mockRepository.findSchedulesToRun.mockResolvedValue([]);
      await cronService.tickReportSchedules();
      await cronService.triggerAggregations();
      await cronService.triggerCleanup();

      expect(mockQueueService.addJob).toHaveBeenCalled();
    });
  });

  describe('AnalyticsEventConsumer', () => {
    it('should route event payloads to aggregation and real-time services', async () => {
      const spyAggregation = jest.spyOn(aggregationService, 'processEvent').mockResolvedValue();
      const spyRealtime = jest.spyOn(realtimeService, 'publishRealtimeEvent').mockResolvedValue();

      await eventConsumer.onConversationCreated({
        tenantId,
        conversationId: 'c-1',
        customerId: 'cust-1',
        channelId: 'chan-1',
      } as any);

      await eventConsumer.onConversationClosed({
        tenantId,
        conversationId: 'c-1',
        reason: 'solved',
      } as any);

      await eventConsumer.onMessageSent({
        tenantId,
        messageId: 'm-1',
        conversationId: 'c-1',
        senderId: 'user-1',
      } as any);

      await eventConsumer.onMessageReceived({
        tenantId,
        messageId: 'm-2',
        conversationId: 'c-1',
        senderId: 'cust-1',
      } as any);

      await eventConsumer.onTicketCreated({
        tenantId,
        ticketId: 't-1',
        status: 'OPEN',
        priority: 'MEDIUM',
      } as any);

      await eventConsumer.onTicketClosed({
        tenantId,
        ticketId: 't-1',
        resolutionTime: 300,
      } as any);

      await eventConsumer.onAiWorkflowCompleted({
        tenantId,
        workflowId: 'wf-1',
        tokensUsed: 100,
        promptTokens: 50,
        completionTokens: 50,
        estimatedCost: 0.01,
        responseTime: 200,
        isEscalated: false,
        isResolved: true,
      } as any);

      await eventConsumer.onConnectorExecuted({
        tenantId,
        connectorInstanceId: 'conn-1',
        status: 'SUCCESS',
        executionTimeMs: 150,
      } as any);

      await eventConsumer.onWorkflowExecutionCompleted({
        tenantId,
        workflowId: 'wf-2',
        status: 'COMPLETED',
        executionTimeMs: 400,
      } as any);

      await eventConsumer.onCustomerCreated({
        tenantId,
        customerId: 'cust-2',
        email: 'customer@test.com',
      } as any);

      expect(spyAggregation).toHaveBeenCalledTimes(10);
      expect(spyRealtime).toHaveBeenCalledTimes(10);
    });
  });

  describe('AnalyticsQueueProcessor', () => {
    it('should process events, aggregations, reports, exports, and database cleanup jobs', async () => {
      const spyEvent = jest.spyOn(eventConsumer, 'handleEvent').mockResolvedValue();
      const spyAggregateHourly = jest.spyOn(aggregationService, 'aggregateHourly').mockResolvedValue();
      const spyReport = jest.spyOn(reportService, 'generateReportData').mockResolvedValue();
      const spyExport = jest.spyOn(exportService, 'triggerExport').mockResolvedValue();

      const runJob = async (name: string, data: any) => {
        const job = {
          name,
          data: {
            ...data,
            _tenantContext: { tenantId },
          },
          opts: { attempts: 1 },
          attemptsMade: 1,
        } as unknown as Job;

        return queueProcessor.handleJob(job);
      };

      await runJob('analytics-event-job', { eventName: 'test.ev' });
      expect(spyEvent).toHaveBeenCalled();

      await runJob('analytics-aggregation-job', { type: 'hourly' });
      expect(spyAggregateHourly).toHaveBeenCalled();

      await runJob('analytics-report-job', { reportId });
      expect(spyReport).toHaveBeenCalled();

      await runJob('analytics-export-job', { reportId, format: 'PDF' });
      expect(spyExport).toHaveBeenCalled();

      const cleanupRes = await runJob('analytics-cleanup-job', { retentionDays: 10 });
      expect(cleanupRes.success).toBe(true);
    });
  });

  describe('Controllers', () => {
    it('AnalyticsDashboardController - endpoints', async () => {
      const res = await module.get(AnalyticsDashboardController).getDashboard(tenantId);
      expect(res).toBeDefined();

      await module.get(AnalyticsDashboardController).getAiMetrics(tenantId);
      await module.get(AnalyticsDashboardController).getAgentSummary(tenantId);
      await module.get(AnalyticsDashboardController).getAgentMetrics(tenantId, 'agent-1');
      await module.get(AnalyticsDashboardController).getChannelSummary(tenantId);
      await module.get(AnalyticsDashboardController).getChannelMetrics(tenantId, 'chan-1');
      await module.get(AnalyticsDashboardController).getCustomMetrics(tenantId, {
        metricType: 'test',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      });
    });

    it('AnalyticsReportController - endpoints', async () => {
      const reportController = module.get(AnalyticsReportController);
      const res = await reportController.createReport(tenantId, {
        name: 'Report',
        reportType: 'AI Reports',
        timeRange: 'Last 7 Days',
      });
      expect(res).toBeDefined();

      await reportController.getReports(tenantId);
      await reportController.getReport(tenantId, reportId);
      await reportController.updateReport(tenantId, reportId, { name: 'Updated' });
      await reportController.deleteReport(tenantId, reportId);

      await reportController.createSchedule(tenantId, {
        reportId,
        name: 'Schedule',
        cronExpression: '0 0 * * *',
        exportFormat: 'CSV',
        recipients: ['a@b.com'],
      });
      await reportController.getSchedules(tenantId);
      await reportController.getSchedule(tenantId, scheduleId);
      await reportController.updateSchedule(tenantId, scheduleId, { name: 'Updated Sched' });
      await reportController.deleteSchedule(tenantId, scheduleId);
    });

    it('AnalyticsExportController - endpoints', async () => {
      const exportController = module.get(AnalyticsExportController);
      await exportController.triggerManualExport(tenantId, { reportId, format: 'CSV' });

      const mockRes = {
        set: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await exportController.downloadExport(tenantId, 'report.csv', mockRes);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('AnalyticsRealtimeController - endpoints', async () => {
      const realtimeController = module.get(AnalyticsRealtimeController);
      expect(await realtimeController.getLiveCounters(tenantId)).toBeDefined();
      expect(await realtimeController.getLiveSla(tenantId)).toBeDefined();
      expect(await realtimeController.getLiveAi(tenantId)).toBeDefined();
    });

    it('AnalyticsController - legacy overview', async () => {
      const controller = module.get(AnalyticsController);
      expect(await controller.getOverview(tenantId)).toBeDefined();
    });
  });

  describe('AnalyticsRealtimeService - Detailed Operations', () => {
    it('should connect to Redis and set up message handler on module init', async () => {
      await realtimeService.onModuleInit();
      expect(mockRedisSubscribe).toHaveBeenCalledWith('analytics:events');
    });

    it('should quit connections on module destroy', async () => {
      await realtimeService.onModuleInit();
      await realtimeService.onModuleDestroy();
      expect(mockRedisQuit).toHaveBeenCalled();
    });

    it('should join client to tenant room on gateway connection', async () => {
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;
      realtimeService.server = mockServer;

      const mockSocket = {
        id: 'socket-1',
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await realtimeService.handleConnection(mockSocket);
      expect(mockSocket.join).toHaveBeenCalledWith(`tenant_${tenantId}`);
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client on gateway connection if auth token is missing', async () => {
      const mockSocket = {
        id: 'socket-2',
        handshake: {
          auth: {},
          headers: {},
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await realtimeService.handleConnection(mockSocket);
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect log', () => {
      const consoleSpy = jest.spyOn(realtimeService['logger'], 'log');
      realtimeService.handleDisconnect({ id: 'socket-3' } as any);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Client disconnected'));
    });

    it('should publish to Redis on publishRealtimeEvent when connected', async () => {
      await realtimeService.onModuleInit();
      await realtimeService.publishRealtimeEvent(tenantId, 'test-event', { val: 1 });
      expect(mockRedisPublish).toHaveBeenCalledWith(
        'analytics:events',
        expect.stringContaining('test-event'),
      );
    });

    it('should fall back to local broadcast when Redis is not connected', async () => {
      (realtimeService as any).isRedisConnected = false;
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;
      realtimeService.server = mockServer;

      await realtimeService.publishRealtimeEvent(tenantId, 'test-event-local', { val: 2 });
      expect(mockServer.to).toHaveBeenCalledWith(`tenant_${tenantId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('metrics_update', expect.any(Object));
    });

    it('should handle incoming Redis messages and broadcast to the tenant', async () => {
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;
      realtimeService.server = mockServer;

      await realtimeService.onModuleInit();
      expect(mockRedisOnMessageCallback).toBeDefined();

      const message = JSON.stringify({
        tenantId,
        eventName: 'redis-event',
        payload: { ok: true },
      });
      mockRedisOnMessageCallback('analytics:events', message);

      expect(mockServer.to).toHaveBeenCalledWith(`tenant_${tenantId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('metrics_update', expect.objectContaining({
        event: 'redis-event',
        data: { ok: true },
      }));
    });

    it('should gracefully handle malformed JSON messages from Redis', async () => {
      const consoleSpy = jest.spyOn(realtimeService['logger'], 'error');
      await realtimeService.onModuleInit();
      mockRedisOnMessageCallback('analytics:events', 'invalid-json{');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse Redis Pub/Sub message'));
    });
  });
});

