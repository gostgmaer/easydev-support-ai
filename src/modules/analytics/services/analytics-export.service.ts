import { Injectable, Logger, Inject } from '@nestjs/common';
import { AnalyticsReportService } from './analytics-report.service';
import { NotificationService } from '../../notifications/notification.service';
import { ExportReportDto } from '../dtos/analytics.dto';

@Injectable()
export class AnalyticsExportService {
  private readonly logger = new Logger(AnalyticsExportService.name);

  constructor(
    private readonly reportService: AnalyticsReportService,
    private readonly notificationService: NotificationService,
  ) {}

  async generateExport(
    tenantId: string,
    reportId: string,
    format: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    this.logger.log(
      `Generating export for report ${reportId} in format ${format}`,
    );

    // Ensure report has latest data generated
    await this.reportService.generateReportData(tenantId, reportId);
    const report = await this.reportService.getReport(tenantId, reportId);

    const reportData = report.data || {};
    let contentString = '';
    let mimeType = 'application/json';
    let ext = 'json';

    switch (format.toUpperCase()) {
      case 'CSV':
        contentString = this.convertToCsv(reportData);
        mimeType = 'text/csv';
        ext = 'csv';
        break;
      case 'EXCEL':
        contentString = this.convertToCsv(reportData); // Simplified Excel/CSV
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        ext = 'xlsx';
        break;
      case 'PDF':
        contentString = `PDF REPORT: ${report.name}\nType: ${report.reportType}\nTimeRange: ${report.timeRange}\nData:\n${JSON.stringify(reportData, null, 2)}`;
        mimeType = 'application/pdf';
        ext = 'pdf';
        break;
      case 'JSON':
      default:
        contentString = JSON.stringify(reportData, null, 2);
        mimeType = 'application/json';
        ext = 'json';
        break;
    }

    const buffer = Buffer.from(contentString, 'utf-8');
    const filename = `${report.name.replace(/\s+/g, '_')}_export_${Date.now()}.${ext}`;

    return { buffer, mimeType, filename };
  }

  async triggerExport(
    tenantId: string,
    dto: ExportReportDto,
  ): Promise<{ filename: string; downloadUrl: string }> {
    const { filename } = await this.generateExport(
      tenantId,
      dto.reportId,
      dto.format,
    );

    // The download endpoint regenerates the export from the live report data
    // rather than re-serving these exact bytes - nothing persists the buffer
    // between trigger and download, so reportId must travel with the link.
    const downloadUrl = `https://api.easydev.ai/v1/analytics/exports/download/${filename}?reportId=${dto.reportId}`;

    const recipients = dto.recipients || [];
    this.logger.log(
      `Triggering export delivery for ${filename} to ${recipients.length} recipients`,
    );

    for (const recipient of recipients) {
      await this.notificationService.sendEmail(
        tenantId,
        recipient,
        'analytics-report-export',
        {
          reportName: filename,
          exportFormat: dto.format,
          downloadUrl,
          exportedAt: new Date().toISOString(),
        },
      );
    }

    return { filename, downloadUrl };
  }

  private convertToCsv(data: Record<string, any>): string {
    const keys = Object.keys(data);
    if (keys.length === 0) return 'No Data';

    // Basic serialization
    let csv = '';
    csv += 'Metric,Value\n';

    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'object' && val !== null) {
        csv += `"${key}","${JSON.stringify(val).replace(/"/g, '""')}"\n`;
      } else {
        csv += `"${key}","${val}"\n`;
      }
    }

    return csv;
  }
}
