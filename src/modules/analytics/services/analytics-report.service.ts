import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import type { IAnalyticsRepository } from '../repositories/analytics-repository.interface';
import { AnalyticsReport } from '../domain/entities';
import { CreateReportDto, UpdateReportDto } from '../dtos/analytics.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsReportService {
  private readonly logger = new Logger(AnalyticsReportService.name);

  constructor(
    @Inject('IAnalyticsRepository')
    private readonly repository: IAnalyticsRepository,
  ) {}

  async createReport(tenantId: string, dto: CreateReportDto): Promise<AnalyticsReport> {
    this.logger.log(`Creating report ${dto.name} for Tenant ${tenantId}`);
    const report = new AnalyticsReport(uuidv4(), {
      tenantId,
      name: dto.name,
      description: dto.description,
      reportType: dto.reportType,
      timeRange: dto.timeRange,
      filters: dto.filters,
      parameters: dto.parameters,
      data: {},
    });

    await this.repository.saveReport(report);
    
    // Automatically generate and populate report data
    await this.generateReportData(tenantId, report.id);

    return (await this.repository.getReportById(report.id, tenantId))!;
  }

  async getReport(tenantId: string, id: string): Promise<AnalyticsReport> {
    const report = await this.repository.getReportById(id, tenantId);
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async findReports(tenantId: string, reportType?: string): Promise<AnalyticsReport[]> {
    return this.repository.findReports(tenantId, reportType);
  }

  async updateReport(tenantId: string, id: string, dto: UpdateReportDto): Promise<AnalyticsReport> {
    const report = await this.getReport(tenantId, id);

    const updated = new AnalyticsReport(report.id, {
      tenantId: report.tenantId,
      name: dto.name !== undefined ? dto.name : report.name,
      description: dto.description !== undefined ? dto.description : report.description,
      reportType: dto.reportType !== undefined ? dto.reportType : report.reportType,
      timeRange: dto.timeRange !== undefined ? dto.timeRange : report.timeRange,
      filters: dto.filters !== undefined ? dto.filters : report.filters,
      parameters: dto.parameters !== undefined ? dto.parameters : report.parameters,
      data: dto.data !== undefined ? dto.data : report.data,
      createdAt: report.createdAt,
      updatedAt: new Date(),
    });

    await this.repository.saveReport(updated);
    return updated;
  }

  async deleteReport(tenantId: string, id: string): Promise<boolean> {
    await this.getReport(tenantId, id);
    return this.repository.deleteReport(id, tenantId);
  }

  async generateReportData(tenantId: string, reportId: string): Promise<void> {
    this.logger.log(`Compiling report data for report ${reportId}`);
    const report = await this.getReport(tenantId, reportId);

    // Compute range
    const endDate = new Date();
    const startDate = new Date();
    if (report.timeRange === 'Last 24 Hours') {
      startDate.setHours(endDate.getHours() - 24);
    } else if (report.timeRange === 'Last 7 Days') {
      startDate.setDate(endDate.getDate() - 7);
    } else {
      startDate.setDate(endDate.getDate() - 30);
    }

    // Generate simulated data based on report type
    let compiledData: Record<string, any> = {};

    if (report.reportType === 'Realtime Dashboard') {
      const stats = await this.repository.getTenantMetrics(tenantId, startDate, endDate);
      compiledData = {
        summary: stats,
        totalEvents: stats.length,
      };
    } else if (report.reportType === 'AI Reports') {
      const stats = await this.repository.getAiMetrics(tenantId, startDate, endDate);
      compiledData = {
        aiMetrics: stats,
        requestsCount: stats.reduce((acc, row) => acc + (row.aiRequests || 0), 0),
      };
    } else if (report.reportType === 'Agent Reports') {
      const stats = await this.repository.getAgentMetricsSummary(tenantId, startDate, endDate);
      compiledData = {
        agentMetrics: stats,
      };
    } else {
      // Default / Tenant Reports
      const stats = await this.repository.getTenantMetrics(tenantId, startDate, endDate);
      compiledData = {
        metrics: stats,
      };
    }

    report.updateData(compiledData);
    await this.repository.saveReport(report);
  }
}
