import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleAnalyticsRepository } from '../repositories/drizzle-analytics-repository';
import {
  AnalyticsEvent,
  AnalyticsReport,
  AnalyticsMetric,
  AnalyticsSchedule,
} from '../domain/entities';

jest.mock('@easydev/database', () => {
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    then: jest.fn(),
  };
  return {
    db: mockDb,
    schema: {
      analyticsEvents: {
        id: 'id',
        tenantId: 'tenantId',
        eventName: 'eventName',
        aggregateType: 'aggregateType',
        aggregateId: 'aggregateId',
        userId: 'userId',
        timestamp: 'timestamp',
        payload: 'payload',
        metadata: 'metadata',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsReports: {
        id: 'id',
        tenantId: 'tenantId',
        name: 'name',
        description: 'description',
        reportType: 'reportType',
        timeRange: 'timeRange',
        filters: 'filters',
        parameters: 'parameters',
        data: 'data',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsReportSchedules: {
        id: 'id',
        tenantId: 'tenantId',
        reportId: 'reportId',
        name: 'name',
        cronExpression: 'cronExpression',
        timezone: 'timezone',
        exportFormat: 'exportFormat',
        recipients: 'recipients',
        isActive: 'isActive',
        nextRunAt: 'nextRunAt',
        lastRunAt: 'lastRunAt',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsHourlyMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        metricType: 'metricType',
        timestamp: 'timestamp',
        value: 'value',
        dimensions: 'dimensions',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsDailyMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        metricType: 'metricType',
        timestamp: 'timestamp',
        value: 'value',
        dimensions: 'dimensions',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsTenantMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        timestamp: 'timestamp',
        conversationsCount: 'conversationsCount',
        messagesCount: 'messagesCount',
        ticketsCount: 'ticketsCount',
        resolvedTicketsCount: 'resolvedTicketsCount',
        averageResponseTime: 'averageResponseTime',
        averageResolutionTime: 'averageResolutionTime',
        csatScore: 'csatScore',
        slaViolationRate: 'slaViolationRate',
        estimatedCostSavings: 'estimatedCostSavings',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsAgentMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        agentId: 'agentId',
        timestamp: 'timestamp',
        assignedConversations: 'assignedConversations',
        resolvedConversations: 'resolvedConversations',
        assignedTickets: 'assignedTickets',
        resolvedTickets: 'resolvedTickets',
        averageResponseTime: 'averageResponseTime',
        averageResolutionTime: 'averageResolutionTime',
        csatScore: 'csatScore',
        workload: 'workload',
        utilization: 'utilization',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsChannelMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        channelId: 'channelId',
        channelType: 'channelType',
        timestamp: 'timestamp',
        messageCount: 'messageCount',
        conversationCount: 'conversationCount',
        responseTime: 'responseTime',
        deliverySuccessRate: 'deliverySuccessRate',
        failureRate: 'failureRate',
        usageVolume: 'usageVolume',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsAiMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        timestamp: 'timestamp',
        aiRequests: 'aiRequests',
        tokensUsed: 'tokensUsed',
        promptTokens: 'promptTokens',
        completionTokens: 'completionTokens',
        estimatedCost: 'estimatedCost',
        responseTime: 'responseTime',
        escalationRate: 'escalationRate',
        aiResolutionRate: 'aiResolutionRate',
        humanResolutionRate: 'humanResolutionRate',
        workflowExecutions: 'workflowExecutions',
        toolCalls: 'toolCalls',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsTicketMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        timestamp: 'timestamp',
        status: 'status',
        priority: 'priority',
        ticketCount: 'ticketCount',
        responseTime: 'responseTime',
        resolutionTime: 'resolutionTime',
        slaViolationsCount: 'slaViolationsCount',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsWorkflowMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        timestamp: 'timestamp',
        workflowId: 'workflowId',
        executionsCount: 'executionsCount',
        failedExecutionsCount: 'failedExecutionsCount',
        averageExecutionTime: 'averageExecutionTime',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      analyticsCustomerMetrics: {
        id: 'id',
        tenantId: 'tenantId',
        timestamp: 'timestamp',
        customerId: 'customerId',
        lifetimeValue: 'lifetimeValue',
        conversationCount: 'conversationCount',
        ticketCount: 'ticketCount',
        sentimentScore: 'sentimentScore',
        retentionScore: 'retentionScore',
        riskScore: 'riskScore',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    },
  };
});



import { db } from '@easydev/database';
const mockDbInstance = db as any;

function mockDbResolve(value: any) {
  mockDbInstance.then.mockImplementation((onfulfilled: any) => {
    return Promise.resolve(value).then(onfulfilled);
  });
}

describe('DrizzleAnalyticsRepository', () => {

  let repository: DrizzleAnalyticsRepository;
  const tenantId = 'tenant-123';
  const reportId = 'report-123';
  const scheduleId = 'schedule-123';

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrizzleAnalyticsRepository],
    }).compile();

    repository = module.get<DrizzleAnalyticsRepository>(DrizzleAnalyticsRepository);
  });

  describe('Events', () => {
    it('should insert a new event if it does not exist', async () => {
      mockDbResolve([]);
      const event = AnalyticsEvent.create('evt-1', {
        tenantId,
        eventName: 'conversation.created',
        aggregateType: 'Conversation',
        aggregateId: 'conv-1',
        timestamp: new Date(),
        payload: { x: 1 },
      });

      await repository.saveEvent(event);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update an event if it already exists', async () => {
      mockDbResolve([{ id: 'evt-1', tenantId }]);
      const event = AnalyticsEvent.create('evt-1', {
        tenantId,
        eventName: 'conversation.created',
        aggregateType: 'Conversation',
        aggregateId: 'conv-1',
        timestamp: new Date(),
        payload: { x: 1 },
      });

      await repository.saveEvent(event);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should find events', async () => {
      mockDbResolve([
        {
          id: 'evt-1',
          tenantId,
          eventName: 'conversation.created',
          aggregateType: 'Conversation',
          aggregateId: 'conv-1',
          timestamp: new Date(),
          payload: {},
          metadata: {},
          createdAt: new Date(),
        },
      ]);

      const events = await repository.findEvents(tenantId, 'conversation.created', new Date(), new Date());
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('evt-1');
    });
  });

  describe('Reports', () => {
    it('should insert a new report if it does not exist', async () => {
      mockDbResolve([]);
      const report = new AnalyticsReport(reportId, {
        tenantId,
        name: 'My Report',
        reportType: 'Tenant Reports',
        timeRange: 'Last 7 Days',
      });

      await repository.saveReport(report);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update report if it exists', async () => {
      mockDbResolve([{ id: reportId, tenantId }]);
      const report = new AnalyticsReport(reportId, {
        tenantId,
        name: 'My Report',
        reportType: 'Tenant Reports',
        timeRange: 'Last 7 Days',
      });

      await repository.saveReport(report);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get report by id', async () => {
      mockDbResolve([
        {
          id: reportId,
          tenantId,
          name: 'My Report',
          reportType: 'Tenant Reports',
          timeRange: 'Last 7 Days',
          filters: {},
          parameters: {},
          data: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const report = await repository.getReportById(reportId, tenantId);
      expect(report).not.toBeNull();
      expect(report?.id).toBe(reportId);
    });

    it('should return null if report not found', async () => {
      mockDbResolve([]);
      const report = await repository.getReportById(reportId, tenantId);
      expect(report).toBeNull();
    });

    it('should find reports', async () => {
      mockDbResolve([
        {
          id: reportId,
          tenantId,
          name: 'My Report',
          reportType: 'Tenant Reports',
          timeRange: 'Last 7 Days',
          filters: {},
          parameters: {},
          data: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const reports = await repository.findReports(tenantId, 'Tenant Reports');
      expect(reports).toHaveLength(1);
    });

    it('should delete report', async () => {
      mockDbResolve({ affected: 1 });
      const success = await repository.deleteReport(reportId, tenantId);
      expect(success).toBe(true);
      expect(mockDbInstance.delete).toHaveBeenCalled();
    });
  });

  describe('Schedules', () => {
    it('should insert schedule if not exists', async () => {
      mockDbResolve([]);
      const schedule = new AnalyticsSchedule(scheduleId, {
        tenantId,
        reportId,
        name: 'Sched 1',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        exportFormat: 'CSV',
        recipients: ['a@b.com'],
        isActive: true,
      });

      await repository.saveSchedule(schedule);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update schedule if exists', async () => {
      mockDbResolve([{ id: scheduleId }]);
      const schedule = new AnalyticsSchedule(scheduleId, {
        tenantId,
        reportId,
        name: 'Sched 1',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        exportFormat: 'CSV',
        recipients: ['a@b.com'],
        isActive: true,
      });

      await repository.saveSchedule(schedule);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get schedule by id', async () => {
      mockDbResolve([
        {
          id: scheduleId,
          tenantId,
          reportId,
          name: 'Sched 1',
          cronExpression: '0 0 * * *',
          timezone: 'UTC',
          exportFormat: 'CSV',
          recipients: ['a@b.com'],
          isActive: true,
          nextRunAt: new Date(),
          lastRunAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const schedule = await repository.getScheduleById(scheduleId, tenantId);
      expect(schedule).not.toBeNull();
      expect(schedule?.id).toBe(scheduleId);
    });

    it('should return null if schedule not found', async () => {
      mockDbResolve([]);
      const schedule = await repository.getScheduleById(scheduleId, tenantId);
      expect(schedule).toBeNull();
    });

    it('should find schedules', async () => {
      mockDbResolve([
        {
          id: scheduleId,
          tenantId,
          reportId,
          name: 'Sched 1',
          cronExpression: '0 0 * * *',
          timezone: 'UTC',
          exportFormat: 'CSV',
          recipients: ['a@b.com'],
          isActive: true,
          nextRunAt: new Date(),
          lastRunAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const schedules = await repository.findSchedules(tenantId, true);
      expect(schedules).toHaveLength(1);
    });

    it('should delete schedule', async () => {
      mockDbResolve({ affected: 1 });
      const success = await repository.deleteSchedule(scheduleId, tenantId);
      expect(success).toBe(true);
    });

    it('should find schedules to run', async () => {
      mockDbResolve([
        {
          id: scheduleId,
          tenantId,
          reportId,
          name: 'Sched 1',
          cronExpression: '0 0 * * *',
          timezone: 'UTC',
          exportFormat: 'CSV',
          recipients: ['a@b.com'],
          isActive: true,
          nextRunAt: new Date(),
          lastRunAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const schedules = await repository.findSchedulesToRun(new Date());
      expect(schedules).toHaveLength(1);
    });
  });

  describe('Hourly and Daily Metrics', () => {
    const metric = new AnalyticsMetric('m-1', {
      tenantId,
      metricType: 'conversation.created',
      timestamp: new Date(),
      value: 12.34,
      dimensions: { channel: 'sms' },
    });

    it('should save hourly metric (insert vs update)', async () => {
      mockDbResolve([]);
      await repository.saveHourlyMetric(metric);
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'm-1' }]);
      await repository.saveHourlyMetric(metric);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should save daily metric (insert vs update)', async () => {
      mockDbResolve([]);
      await repository.saveDailyMetric(metric);
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'm-1' }]);
      await repository.saveDailyMetric(metric);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get hourly metrics', async () => {
      mockDbResolve([
        {
          id: 'm-1',
          tenantId,
          metricType: 'conversation.created',
          timestamp: new Date(),
          value: '12.34',
          dimensions: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const list = await repository.getHourlyMetrics(tenantId, 'conversation.created', new Date(), new Date());
      expect(list).toHaveLength(1);
      expect(list[0].value).toBe(12.34);
    });

    it('should get daily metrics', async () => {
      mockDbResolve([
        {
          id: 'm-1',
          tenantId,
          metricType: 'conversation.created',
          timestamp: new Date(),
          value: '12.34',
          dimensions: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const list = await repository.getDailyMetrics(tenantId, 'conversation.created', new Date(), new Date());
      expect(list).toHaveLength(1);
      expect(list[0].value).toBe(12.34);
    });
  });

  describe('All other tenant-specific metric types', () => {
    it('Tenant metrics - save and get', async () => {
      mockDbResolve([]);
      await repository.saveTenantMetrics({ tenantId, timestamp: new Date(), conversationsCount: 5 });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 't-1' }]);
      await repository.saveTenantMetrics({ tenantId, timestamp: new Date(), conversationsCount: 5 });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 't-1', tenantId, timestamp: new Date() }]);
      const list = await repository.getTenantMetrics(tenantId, new Date(), new Date());
      expect(list).toHaveLength(1);
    });

    it('Agent metrics - save, get, summary', async () => {
      mockDbResolve([]);
      await repository.saveAgentMetrics({ tenantId, agentId: 'agent-1', timestamp: new Date() });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'a-1' }]);
      await repository.saveAgentMetrics({ tenantId, agentId: 'agent-1', timestamp: new Date() });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 'a-1' }]);
      const metrics = await repository.getAgentMetrics(tenantId, 'agent-1', new Date(), new Date());
      expect(metrics).toHaveLength(1);

      mockDbResolve([{ id: 'a-1' }]);
      const summary = await repository.getAgentMetricsSummary(tenantId, new Date(), new Date());
      expect(summary).toHaveLength(1);
    });

    it('Channel metrics - save, get, summary', async () => {
      mockDbResolve([]);
      await repository.saveChannelMetrics({ tenantId, channelId: 'c-1', timestamp: new Date() });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'c-1' }]);
      await repository.saveChannelMetrics({ tenantId, channelId: 'c-1', timestamp: new Date() });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 'c-1' }]);
      const metrics = await repository.getChannelMetrics(tenantId, 'c-1', new Date(), new Date());
      expect(metrics).toHaveLength(1);

      mockDbResolve([{ id: 'c-1' }]);
      const summary = await repository.getChannelMetricsSummary(tenantId, new Date(), new Date());
      expect(summary).toHaveLength(1);
    });

    it('AI metrics - save and get', async () => {
      mockDbResolve([]);
      await repository.saveAiMetrics({ tenantId, timestamp: new Date() });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'ai-1' }]);
      await repository.saveAiMetrics({ tenantId, timestamp: new Date() });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 'ai-1' }]);
      const list = await repository.getAiMetrics(tenantId, new Date(), new Date());
      expect(list).toHaveLength(1);
    });

    it('Ticket metrics - save and get', async () => {
      mockDbResolve([]);
      await repository.saveTicketMetrics({ tenantId, timestamp: new Date(), status: 'OPEN', priority: 'HIGH' });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'ticket-1' }]);
      await repository.saveTicketMetrics({ tenantId, timestamp: new Date(), status: 'OPEN', priority: 'HIGH' });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 'ticket-1' }]);
      const list = await repository.getTicketMetrics(tenantId, new Date(), new Date());
      expect(list).toHaveLength(1);
    });

    it('Workflow metrics - save, get, summary', async () => {
      mockDbResolve([]);
      await repository.saveWorkflowMetrics({ tenantId, workflowId: 'wf-1', timestamp: new Date() });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'wf-1' }]);
      await repository.saveWorkflowMetrics({ tenantId, workflowId: 'wf-1', timestamp: new Date() });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 'wf-1' }]);
      const list = await repository.getWorkflowMetrics(tenantId, 'wf-1', new Date(), new Date());
      expect(list).toHaveLength(1);

      mockDbResolve([{ id: 'wf-1' }]);
      const summary = await repository.getWorkflowMetricsSummary(tenantId, new Date(), new Date());
      expect(summary).toHaveLength(1);
    });

    it('Customer metrics - save and get', async () => {
      mockDbResolve([]);
      await repository.saveCustomerMetrics({ tenantId, customerId: 'cust-1', timestamp: new Date() });
      expect(mockDbInstance.insert).toHaveBeenCalled();

      mockDbResolve([{ id: 'cust-1' }]);
      await repository.saveCustomerMetrics({ tenantId, customerId: 'cust-1', timestamp: new Date() });
      expect(mockDbInstance.update).toHaveBeenCalled();

      mockDbResolve([{ id: 'cust-1' }]);
      const list = await repository.getCustomerMetrics(tenantId, 'cust-1');
      expect(list).toHaveLength(1);
    });
  });
});
