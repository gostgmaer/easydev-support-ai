import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IAdminRepository } from '../repositories/admin-repository.interface';
import type { IAnalyticsRepository } from '../../analytics/repositories/analytics-repository.interface';
import { AnalyticsDashboardService } from '../../analytics/services/analytics-dashboard.service';
import { AiUsageService } from '../../ai-integration/services/ai-usage.service';
import { ConnectorService } from '../../connectors/services/connector.service';
import { CustomerService } from '../../customers/services/customer.service';
import { InboxPresenceService } from '../../inbox/services/inbox-presence.service';
import { AdminWidget } from '../domain/admin-widget.entity';
import { AdminWidgetTypeEnum } from '../domain/value-objects';
import { CreateWidgetDto, UpdateWidgetDto } from '../dtos';

const DEFAULT_TIME_RANGE = 'Last 30 Days';

@Injectable()
export class AdminWidgetService {
  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    @Inject('IAnalyticsRepository')
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly analyticsDashboardService: AnalyticsDashboardService,
    private readonly aiUsageService: AiUsageService,
    private readonly connectorService: ConnectorService,
    private readonly customerService: CustomerService,
    private readonly inboxPresenceService: InboxPresenceService,
  ) {}

  public async createWidget(
    tenantId: string,
    dashboardId: string,
    dto: CreateWidgetDto,
  ): Promise<AdminWidget> {
    const dashboard = await this.repository.getDashboard(tenantId, dashboardId);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${dashboardId} not found`);
    }
    const widget = AdminWidget.create(crypto.randomUUID(), {
      tenantId,
      dashboardId,
      widgetType: dto.widgetType,
      title: dto.title,
      position: dto.position,
      configuration: dto.configuration,
      refreshIntervalSeconds: dto.refreshIntervalSeconds,
    });
    await this.repository.saveWidget(widget, tenantId);
    return widget;
  }

  public async updateWidget(
    tenantId: string,
    widgetId: string,
    dto: UpdateWidgetDto,
  ): Promise<AdminWidget> {
    const widget = await this.getWidget(tenantId, widgetId);
    if (dto.position) widget.reposition(dto.position);
    if (dto.configuration) widget.configure(dto.configuration);
    if (dto.refreshIntervalSeconds)
      widget.setRefreshInterval(dto.refreshIntervalSeconds);
    if (dto.isEnabled === true) widget.enable();
    if (dto.isEnabled === false) widget.disable();
    await this.repository.saveWidget(widget, tenantId);
    return widget;
  }

  public async getWidget(
    tenantId: string,
    widgetId: string,
  ): Promise<AdminWidget> {
    const widget = await this.repository.getWidget(tenantId, widgetId);
    if (!widget) {
      throw new NotFoundException(`Widget with ID ${widgetId} not found`);
    }
    return widget;
  }

  public async listWidgets(
    tenantId: string,
    dashboardId: string,
  ): Promise<AdminWidget[]> {
    return this.repository.listWidgets(tenantId, dashboardId);
  }

  public async deleteWidget(
    tenantId: string,
    widgetId: string,
  ): Promise<boolean> {
    return this.repository.deleteWidget(tenantId, widgetId);
  }

  public async getWidgetData(
    tenantId: string,
    widgetId: string,
    timeRange = DEFAULT_TIME_RANGE,
  ): Promise<any> {
    const widget = await this.getWidget(tenantId, widgetId);
    return this.computeWidgetData(tenantId, widget.widgetType.value, timeRange);
  }

  public async computeWidgetData(
    tenantId: string,
    widgetType: AdminWidgetTypeEnum,
    timeRange = DEFAULT_TIME_RANGE,
  ): Promise<any> {
    switch (widgetType) {
      case AdminWidgetTypeEnum.CONVERSATION_METRICS: {
        const m = await this.analyticsDashboardService.getDashboardMetrics(
          tenantId,
          timeRange,
        );
        return {
          conversationsCount: m.conversationsCount,
          messagesCount: m.messagesCount,
          averageResponseTime: m.averageResponseTime,
          averageResolutionTime: m.averageResolutionTime,
          csatScore: m.csatScore,
        };
      }

      case AdminWidgetTypeEnum.TICKET_METRICS: {
        const m = await this.analyticsDashboardService.getDashboardMetrics(
          tenantId,
          timeRange,
        );
        return {
          ticketsCount: m.ticketsCount,
          resolvedTicketsCount: m.resolvedTicketsCount,
          slaViolationRate: m.slaViolationRate,
        };
      }

      case AdminWidgetTypeEnum.SLA_METRICS: {
        const m = await this.analyticsDashboardService.getDashboardMetrics(
          tenantId,
          timeRange,
        );
        return { slaViolationRate: m.slaViolationRate };
      }

      case AdminWidgetTypeEnum.REVENUE_METRICS: {
        const m = await this.analyticsDashboardService.getDashboardMetrics(
          tenantId,
          timeRange,
        );
        return { estimatedCostSavings: m.estimatedCostSavings };
      }

      case AdminWidgetTypeEnum.AI_METRICS: {
        const dashboardMetrics =
          await this.analyticsDashboardService.getAiDashboardMetrics(
            tenantId,
            timeRange,
          );
        const today = new Date().toISOString().slice(0, 10);
        const usageToday = await this.aiUsageService.getUsageMetrics(
          tenantId,
          undefined,
          today,
          today,
        );
        return {
          ...dashboardMetrics,
          costToday: usageToday.reduce(
            (sum, u) => sum + Number(u.cost || 0),
            0,
          ),
        };
      }

      case AdminWidgetTypeEnum.WORKFLOW_METRICS: {
        const { startDate, endDate } = this.resolveTimeRange(timeRange);
        const rows = await this.analyticsRepository.getWorkflowMetricsSummary(
          tenantId,
          startDate,
          endDate,
        );
        const summary = rows.reduce(
          (acc, r) => {
            acc.executionCount += r.executionCount || 0;
            acc.successCount += r.successCount || 0;
            acc.failureCount += r.failureCount || 0;
            acc.averageDuration += Number(r.averageDuration || 0);
            return acc;
          },
          {
            executionCount: 0,
            successCount: 0,
            failureCount: 0,
            averageDuration: 0,
          },
        );
        if (rows.length > 0) summary.averageDuration /= rows.length;
        return summary;
      }

      case AdminWidgetTypeEnum.CONNECTOR_METRICS: {
        const [total, healthy, unhealthy] = await Promise.all([
          this.connectorService.getConnectors(tenantId, { limit: 1 }),
          this.connectorService.getConnectors(tenantId, {
            limit: 1,
            healthStatus: 'HEALTHY',
          }),
          this.connectorService.getConnectors(tenantId, {
            limit: 1,
            healthStatus: 'UNHEALTHY',
          }),
        ]);
        return {
          totalConnectors: total.total,
          healthyConnectors: healthy.total,
          unhealthyConnectors: unhealthy.total,
        };
      }

      case AdminWidgetTypeEnum.CUSTOMER_METRICS: {
        const customers = await this.customerService.findPaginated(tenantId, {
          page: 1,
          limit: 1,
        });
        return { totalCustomers: (customers as any).total ?? 0 };
      }

      case AdminWidgetTypeEnum.AGENT_METRICS: {
        const [summary, online] = await Promise.all([
          this.analyticsDashboardService.getAgentSummaryMetrics(
            tenantId,
            timeRange,
          ),
          this.inboxPresenceService.listOnline(tenantId),
        ]);
        return {
          totalActiveAgents: summary.length,
          onlineAgents: online.length,
        };
      }

      case AdminWidgetTypeEnum.SYSTEM_HEALTH: {
        const services = await this.repository.listSystemHealth(tenantId);
        return {
          services: services.map((s) => s.toJSON()),
          healthyCount: services.filter((s) => s.status.isOperational()).length,
          totalCount: services.length,
        };
      }

      default:
        return {};
    }
  }

  private resolveTimeRange(timeRange: string): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case 'Last 24 Hours':
        startDate.setHours(endDate.getHours() - 24);
        break;
      case 'Last 7 Days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'Last 90 Days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        break;
    }
    return { startDate, endDate };
  }
}
