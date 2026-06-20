import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report type, e.g., AI Reports, Agent Reports' })
  @IsString()
  @IsNotEmpty()
  reportType: string;

  @ApiProperty({ description: 'Time range, e.g., Last 7 Days, Last 30 Days' })
  @IsString()
  @IsNotEmpty()
  timeRange: string;

  @ApiPropertyOptional({ description: 'Filtering parameters', type: Object })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Custom formatting options', type: Object })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export class UpdateReportDto {
  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Report type' })
  @IsOptional()
  @IsString()
  reportType?: string;

  @ApiPropertyOptional({ description: 'Time range' })
  @IsOptional()
  @IsString()
  timeRange?: string;

  @ApiPropertyOptional({ description: 'Filters', type: Object })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Parameters', type: Object })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Pre-computed report data', type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class CreateScheduleDto {
  @ApiProperty({ description: 'Target Report ID' })
  @IsString()
  @IsNotEmpty()
  reportId: string;

  @ApiProperty({ description: 'Schedule name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Cron expression' })
  @IsString()
  @IsNotEmpty()
  cronExpression: string;

  @ApiPropertyOptional({ description: 'Timezone for execution', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Export format, e.g., CSV, Excel, PDF, JSON' })
  @IsString()
  @IsNotEmpty()
  exportFormat: string;

  @ApiProperty({ description: 'Recipient email addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({ description: 'Whether the schedule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Schedule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Cron expression' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Export format' })
  @IsOptional()
  @IsString()
  exportFormat?: string;

  @ApiPropertyOptional({ description: 'Recipients', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Is schedule active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExportReportDto {
  @ApiProperty({ description: 'Target Report ID' })
  @IsString()
  @IsNotEmpty()
  reportId: string;

  @ApiProperty({ description: 'Export format, e.g., CSV, PDF, JSON' })
  @IsString()
  @IsNotEmpty()
  format: string;

  @ApiPropertyOptional({ description: 'Recipients list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}

export class CustomMetricQueryDto {
  @ApiProperty({ description: 'Metric type' })
  @IsString()
  @IsNotEmpty()
  metricType: string;

  @ApiProperty({ description: 'Start date of query range' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of query range' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

export class TimeRangeDto {
  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
