import { Injectable, Logger, Inject } from '@nestjs/common';
import type { IAnalyticsRepository } from '../repositories/analytics-repository.interface';
import { AnalyticsMetric } from '../domain/entities';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsAggregationService {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(
    @Inject('IAnalyticsRepository')
    private readonly repository: IAnalyticsRepository,
  ) {}

  async processEvent(event: {
    tenantId: string;
    eventName: string;
    aggregateType: string;
    aggregateId: string;
    userId?: string;
    timestamp: string;
    payload: any;
    metadata?: any;
  }): Promise<void> {
    const timestamp = new Date(event.timestamp);
    const hourStart = new Date(timestamp);
    hourStart.setMinutes(0, 0, 0);

    const tenantId = event.tenantId;

    switch (event.eventName) {
      case 'conversation.created': {
        const channelId = event.payload.channelId || uuidv4();
        const channelType = event.payload.channelType || 'WEB';

        // Update Tenant Metrics
        await this.repository.saveTenantMetrics({
          tenantId,
          timestamp: hourStart,
          conversationsCount: 1,
        });

        // Update Channel Metrics
        await this.repository.saveChannelMetrics({
          tenantId,
          channelId,
          channelType,
          timestamp: hourStart,
          conversationCount: 1,
          usageVolume: 1,
        });
        break;
      }

      case 'conversation.closed': {
        const resolutionTime = event.payload.resolutionTime || 0;
        const isSlaViolated = event.payload.isSlaViolated ? 1 : 0;
        const agentId = event.payload.agentId || uuidv4();

        // Update Tenant Metrics
        await this.repository.saveTenantMetrics({
          tenantId,
          timestamp: hourStart,
          resolvedTicketsCount: 1,
          averageResolutionTime: resolutionTime,
          slaViolationRate: isSlaViolated ? 100 : 0,
        });

        // Update Agent Metrics
        await this.repository.saveAgentMetrics({
          tenantId,
          agentId,
          timestamp: hourStart,
          resolvedConversations: 1,
          averageResolutionTime: resolutionTime,
        });
        break;
      }

      case 'message.sent':
      case 'message.received': {
        const channelId = event.payload.channelId || uuidv4();
        const channelType = event.payload.channelType || 'WEB';

        // Update Tenant Metrics
        await this.repository.saveTenantMetrics({
          tenantId,
          timestamp: hourStart,
          messagesCount: 1,
        });

        // Update Channel Metrics
        await this.repository.saveChannelMetrics({
          tenantId,
          channelId,
          channelType,
          timestamp: hourStart,
          messageCount: 1,
        });
        break;
      }

      case 'ticket.created': {
        const status = event.payload.status || 'OPEN';
        const priority = event.payload.priority || 'MEDIUM';
        const agentId = event.payload.agentId || uuidv4();

        // Update Tenant Metrics
        await this.repository.saveTenantMetrics({
          tenantId,
          timestamp: hourStart,
          ticketsCount: 1,
        });

        // Update Agent Metrics
        await this.repository.saveAgentMetrics({
          tenantId,
          agentId,
          timestamp: hourStart,
          assignedTickets: 1,
        });

        // Update Ticket Metrics
        await this.repository.saveTicketMetrics({
          tenantId,
          timestamp: hourStart,
          status,
          priority,
          ticketCount: 1,
        });
        break;
      }

      case 'ticket.closed': {
        const resolutionTime = event.payload.resolutionTime || 0;
        const agentId = event.payload.agentId || uuidv4();
        const status = 'CLOSED';
        const priority = event.payload.priority || 'MEDIUM';

        // Update Agent Metrics
        await this.repository.saveAgentMetrics({
          tenantId,
          agentId,
          timestamp: hourStart,
          resolvedTickets: 1,
          averageResolutionTime: resolutionTime,
        });

        // Update Ticket Metrics
        await this.repository.saveTicketMetrics({
          tenantId,
          timestamp: hourStart,
          status,
          priority,
          ticketCount: 0,
          resolutionTime,
        });
        break;
      }

      case 'ai.workflow.completed': {
        const tokensUsed = event.payload.tokensUsed || 0;
        const promptTokens = event.payload.promptTokens || 0;
        const completionTokens = event.payload.completionTokens || 0;
        const estimatedCost = event.payload.estimatedCost || 0;
        const responseTime = event.payload.responseTime || 0;
        const isEscalated = event.payload.isEscalated ? 1 : 0;
        const isResolved = event.payload.isResolved ? 1 : 0;

        await this.repository.saveAiMetrics({
          tenantId,
          timestamp: hourStart,
          aiRequests: 1,
          tokensUsed,
          promptTokens,
          completionTokens,
          estimatedCost,
          responseTime,
          escalationRate: isEscalated ? 100 : 0,
          aiResolutionRate: isResolved ? 100 : 0,
          humanResolutionRate: isEscalated ? 100 : 0,
          workflowExecutions: 1,
          toolCalls: event.payload.toolCalls || 0,
        });
        break;
      }

      case 'connector.executed': {
        // Increment workflow executions count
        await this.repository.saveAiMetrics({
          tenantId,
          timestamp: hourStart,
          workflowExecutions: 1,
        });
        break;
      }

      case 'workflow.execution.completed': {
        const workflowId = event.payload.workflowId || uuidv4();
        const success = event.payload.status === 'COMPLETED' ? 1 : 0;
        const failure = success ? 0 : 1;
        const duration = event.payload.executionTimeMs || 0;

        await this.repository.saveWorkflowMetrics({
          tenantId,
          workflowId,
          timestamp: hourStart,
          executionCount: 1,
          successCount: success,
          failureCount: failure,
          averageDuration: duration,
        });
        break;
      }

      case 'customer.created': {
        const customerId = event.payload.customerId || uuidv4();
        await this.repository.saveCustomerMetrics({
          tenantId,
          customerId,
          timestamp: hourStart,
          conversationCount: 0,
          ticketCount: 0,
          lifetimeValue: 0,
          sentimentScore: 50,
          retentionScore: 100,
          riskScore: 0,
        });
        break;
      }
    }

    // Record raw metric entries in hourly/daily metrics for historical plotting
    await this.repository.saveHourlyMetric(
      new AnalyticsMetric(uuidv4(), {
        tenantId,
        metricType: event.eventName,
        timestamp: hourStart,
        value: 1,
        dimensions: {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
        },
      }),
    );
  }

  async aggregateHourly(tenantId: string, timestamp: Date): Promise<void> {
    this.logger.log(
      `Running hourly aggregations for Tenant ${tenantId} at ${timestamp.toISOString()}`,
    );
    // Rollup raw hourly metrics into hourly tables (calculated from raw events)
    const startTime = new Date(timestamp);
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const events = await this.repository.findEvents(
      tenantId,
      undefined,
      startTime,
      endTime,
    );

    // Group events by eventName and aggregate counts
    const eventCounts: Record<string, number> = {};
    for (const event of events) {
      eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
    }

    for (const [eventName, count] of Object.entries(eventCounts)) {
      await this.repository.saveHourlyMetric(
        new AnalyticsMetric(uuidv4(), {
          tenantId,
          metricType: `rollup:${eventName}`,
          timestamp: startTime,
          value: count,
          dimensions: { rolledUpAt: new Date().toISOString() },
        }),
      );
    }
  }

  async aggregateDaily(tenantId: string, timestamp: Date): Promise<void> {
    this.logger.log(
      `Running daily aggregations for Tenant ${tenantId} at ${timestamp.toISOString()}`,
    );
    const startOfDay = new Date(timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Sum up hourly metrics for the day
    const hourlyEventTypes = [
      'conversation.created',
      'message.sent',
      'ticket.created',
      'ai.workflow.completed',
    ];

    for (const metricType of hourlyEventTypes) {
      const hourlyMetrics = await this.repository.getHourlyMetrics(
        tenantId,
        metricType,
        startOfDay,
        endOfDay,
      );
      const totalValue = hourlyMetrics.reduce((sum, m) => sum + m.value, 0);

      await this.repository.saveDailyMetric(
        new AnalyticsMetric(uuidv4(), {
          tenantId,
          metricType,
          timestamp: startOfDay,
          value: totalValue,
          dimensions: { aggregatedFromHours: hourlyMetrics.length },
        }),
      );
    }
  }

  async aggregateWeekly(tenantId: string, timestamp: Date): Promise<void> {
    this.logger.log(
      `Running weekly aggregations for Tenant ${tenantId} at ${timestamp.toISOString()}`,
    );
    // Rollup daily metrics into weekly metrics
    const startOfWeek = new Date(timestamp);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const metricTypes = [
      'conversation.created',
      'message.sent',
      'ticket.created',
      'ai.workflow.completed',
    ];

    for (const metricType of metricTypes) {
      const dailyMetrics = await this.repository.getDailyMetrics(
        tenantId,
        metricType,
        startOfWeek,
        endOfWeek,
      );
      const totalValue = dailyMetrics.reduce((sum, m) => sum + m.value, 0);

      await this.repository.saveDailyMetric(
        new AnalyticsMetric(uuidv4(), {
          tenantId,
          metricType: `weekly:${metricType}`,
          timestamp: startOfWeek,
          value: totalValue,
          dimensions: { aggregatedFromDays: dailyMetrics.length },
        }),
      );
    }
  }

  async aggregateMonthly(tenantId: string, timestamp: Date): Promise<void> {
    this.logger.log(
      `Running monthly aggregations for Tenant ${tenantId} at ${timestamp.toISOString()}`,
    );
    const startOfMonth = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth() + 1,
      1,
    );

    const metricTypes = [
      'conversation.created',
      'message.sent',
      'ticket.created',
      'ai.workflow.completed',
    ];

    for (const metricType of metricTypes) {
      const dailyMetrics = await this.repository.getDailyMetrics(
        tenantId,
        metricType,
        startOfMonth,
        endOfMonth,
      );
      const totalValue = dailyMetrics.reduce((sum, m) => sum + m.value, 0);

      await this.repository.saveDailyMetric(
        new AnalyticsMetric(uuidv4(), {
          tenantId,
          metricType: `monthly:${metricType}`,
          timestamp: startOfMonth,
          value: totalValue,
          dimensions: { aggregatedFromDays: dailyMetrics.length },
        }),
      );
    }
  }
}
