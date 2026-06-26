import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/feature-flag.decorator';
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
  @RequireFeature('analytics.advanced')
  @UseGuards(FeatureFlagGuard)
  @ApiOperation({
    summary: 'Manually trigger an export generation and delivery',
  })
  @ApiResponse({ status: 200, description: 'Export successfully queued.' })
  async triggerManualExport(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ExportReportDto,
  ) {
    const { downloadUrl } = await this.exportService.triggerExport(
      tenantId,
      dto,
    );
    return {
      success: true,
      message: 'Export triggered and queued for delivery.',
      downloadUrl,
    };
  }

  @Get('download/:filename')
  @Roles('tenant_admin', 'manager')
  @ApiOperation({ summary: 'Download generated report exports directly' })
  @ApiQuery({
    name: 'reportId',
    required: true,
    description:
      'The report this export was generated from (returned as part of the downloadUrl from POST /manual).',
  })
  @ApiResponse({ status: 200, description: 'Export file stream returned.' })
  async downloadExport(
    @Headers('x-tenant-id') tenantId: string,
    @Param('filename') filename: string,
    @Query('reportId') reportId: string,
    @Res() res: Response,
  ) {
    if (!reportId) {
      throw new BadRequestException('Missing reportId query parameter.');
    }
    const format = filename.endsWith('.csv')
      ? 'CSV'
      : filename.endsWith('.pdf')
        ? 'PDF'
        : 'JSON';
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
