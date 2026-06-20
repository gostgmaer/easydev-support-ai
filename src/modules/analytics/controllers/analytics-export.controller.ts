import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AnalyticsExportService } from '../services/analytics-export.service';
import { ExportReportDto } from '../dtos/analytics.dto';
import type { Response } from 'express';

@ApiTags('Analytics Exports')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@Controller('v1/analytics/exports')
@UseGuards(TenantGuard, RbacGuard)
export class AnalyticsExportController {
  constructor(private readonly exportService: AnalyticsExportService) {}

  @Post('manual')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({
    summary: 'Manually trigger an export generation and delivery',
  })
  @ApiResponse({ status: 200, description: 'Export successfully queued.' })
  async triggerManualExport(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ExportReportDto,
  ) {
    await this.exportService.triggerExport(tenantId, dto);
    return {
      success: true,
      message: 'Export triggered and queued for delivery.',
    };
  }

  @Get('download/:filename')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Download generated report exports directly' })
  @ApiResponse({ status: 200, description: 'Export file stream returned.' })
  async downloadExport(
    @Headers('x-tenant-id') tenantId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const format = filename.endsWith('.csv')
      ? 'CSV'
      : filename.endsWith('.pdf')
        ? 'PDF'
        : 'JSON';
    const reportId = 'dummy-report-id';
    const { buffer, mimeType } = await this.exportService.generateExport(
      tenantId,
      reportId,
      format,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
