import { Injectable, Logger, Inject } from '@nestjs/common';
import type { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

@Injectable()
export class AnalyticsDashboardService {
  private readonly logger = new Logger(AnalyticsDashboardService.name);

  constructor(
    @Inject('IAnalyticsRepository')
    private readonly repository: IAnalyticsRepository,
  ) {}

  async getDashboardMetrics(tenantId: string, timeRange: string): Promise<any> {
    this.logger.log(
      `Fetching dashboard metrics for Tenant ${tenantId} and range ${timeRange}`,
    );
    const { startDate, endDate } = this.parseTimeRange(timeRange);

    const tenantMetrics = await this.repository.getTenantMetrics(
      tenantId,
      startDate,
      endDate,
    );

    // Default response if no metrics have been aggregated yet
    if (tenantMetrics.length === 0) {
      return {
        conversationsCount: 0,
        messagesCount: 0,
        ticketsCount: 0,
        resolvedTicketsCount: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        csatScore: 0,
        slaViolationRate: 0,
        estimatedCostSavings: 0,
      };
    }

    // Sum and average the projection rows
    let conversationsCount = 0;
    let messagesCount = 0;
    let ticketsCount = 0;
    let resolvedTicketsCount = 0;
    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let totalCsatScore = 0;
    let totalSlaViolationRate = 0;
    let totalCostSavings = 0;

    for (const row of tenantMetrics) {
      conversationsCount += row.conversationsCount || 0;
      messagesCount += row.messagesCount || 0;
      ticketsCount += row.ticketsCount || 0;
      resolvedTicketsCount += row.resolvedTicketsCount || 0;
      totalResponseTime += Number(row.averageResponseTime || 0);
      totalResolutionTime += Number(row.averageResolutionTime || 0);
      totalCsatScore += Number(row.csatScore || 0);
      totalSlaViolationRate += Number(row.slaViolationRate || 0);
      totalCostSavings += Number(row.estimatedCostSavings || 0);
    }

    const count = tenantMetrics.length;

    return {
      conversationsCount,
      messagesCount,
      ticketsCount,
      resolvedTicketsCount,
      averageResponseTime: totalResponseTime / count,
      averageResolutionTime: totalResolutionTime / count,
      csatScore: totalCsatScore / count,
      slaViolationRate: totalSlaViolationRate / count,
      estimatedCostSavings: totalCostSavings,
    };
  }

  async getAgentDashboardMetrics(
    tenantId: string,
    agentId: string,
    timeRange: string,
  ): Promise<any[]> {
    const { startDate, endDate } = this.parseTimeRange(timeRange);
    return this.repository.getAgentMetrics(
      tenantId,
      agentId,
      startDate,
      endDate,
    );
  }

  async getAgentSummaryMetrics(
    tenantId: string,
    timeRange: string,
  ): Promise<any[]> {
    const { startDate, endDate } = this.parseTimeRange(timeRange);
    return this.repository.getAgentMetricsSummary(tenantId, startDate, endDate);
  }

  async getChannelDashboardMetrics(
    tenantId: string,
    channelId: string,
    timeRange: string,
  ): Promise<any[]> {
    const { startDate, endDate } = this.parseTimeRange(timeRange);
    return this.repository.getChannelMetrics(
      tenantId,
      channelId,
      startDate,
      endDate,
    );
  }

  async getChannelSummaryMetrics(
    tenantId: string,
    timeRange: string,
  ): Promise<any[]> {
    const { startDate, endDate } = this.parseTimeRange(timeRange);
    return this.repository.getChannelMetricsSummary(
      tenantId,
      startDate,
      endDate,
    );
  }

  async getAiDashboardMetrics(
    tenantId: string,
    timeRange: string,
  ): Promise<any> {
    const { startDate, endDate } = this.parseTimeRange(timeRange);
    const metrics = await this.repository.getAiMetrics(
      tenantId,
      startDate,
      endDate,
    );

    if (metrics.length === 0) {
      return {
        aiRequests: 0,
        tokensUsed: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0,
        responseTime: 0,
        escalationRate: 0,
        aiResolutionRate: 0,
        humanResolutionRate: 0,
        workflowExecutions: 0,
        toolCalls: 0,
      };
    }

    let aiRequests = 0;
    let tokensUsed = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let estimatedCost = 0;
    let responseTime = 0;
    let escalationRateSum = 0;
    let aiResolutionRateSum = 0;
    let humanResolutionRateSum = 0;
    let workflowExecutions = 0;
    let toolCalls = 0;

    for (const m of metrics) {
      aiRequests += m.aiRequests || 0;
      tokensUsed += Number(m.tokensUsed || 0);
      promptTokens += Number(m.promptTokens || 0);
      completionTokens += Number(m.completionTokens || 0);
      estimatedCost += Number(m.estimatedCost || 0);
      responseTime += Number(m.responseTime || 0);
      escalationRateSum += Number(m.escalationRate || 0);
      aiResolutionRateSum += Number(m.aiResolutionRate || 0);
      humanResolutionRateSum += Number(m.humanResolutionRate || 0);
      workflowExecutions += m.workflowExecutions || 0;
      toolCalls += m.toolCalls || 0;
    }

    const count = metrics.length;

    return {
      aiRequests,
      tokensUsed,
      promptTokens,
      completionTokens,
      estimatedCost,
      responseTime: responseTime / count,
      escalationRate: escalationRateSum / count,
      aiResolutionRate: aiResolutionRateSum / count,
      humanResolutionRate: humanResolutionRateSum / count,
      workflowExecutions,
      toolCalls,
    };
  }

  async getCustomMetrics(
    tenantId: string,
    metricType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.repository.getDailyMetrics(
      tenantId,
      metricType,
      startDate,
      endDate,
    );
  }

  private parseTimeRange(timeRange: string): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case 'Last 24 Hours':
        startDate.setHours(endDate.getHours() - 24);
        break;
      case 'Last 7 Days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'Last 30 Days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'Last 90 Days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        // Default to last 30 days
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    return { startDate, endDate };
  }
}
