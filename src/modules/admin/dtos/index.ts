import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsArray,
  IsInt,
  IsBoolean,
  IsUrl,
  Min,
  Max,
  ArrayMinSize,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AdminWidgetTypeEnum,
  AnnouncementSeverityEnum,
  IncidentSeverityEnum,
  IncidentStatusEnum,
} from '../domain/value-objects';

export class CreateDashboardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dashboardName!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  layout?: Record<string, any>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  widgets?: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  defaultView?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}

export class UpdateDashboardDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dashboardName?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  layout?: Record<string, any>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  widgets?: Record<string, any>;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  defaultView?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ enum: AnnouncementSeverityEnum })
  @IsEnum(AnnouncementSeverityEnum)
  @IsOptional()
  severity?: AnnouncementSeverityEnum;

  @ApiPropertyOptional({ default: 'ALL' })
  @IsString()
  @IsOptional()
  audience?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

export class CreateWidgetDto {
  @ApiProperty({ enum: AdminWidgetTypeEnum })
  @IsEnum(AdminWidgetTypeEnum)
  widgetType!: AdminWidgetTypeEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  position?: Record<string, any>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({ default: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @IsOptional()
  refreshIntervalSeconds?: number;
}

export class UpdateWidgetDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  position?: Record<string, any>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @IsOptional()
  refreshIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: [String], example: ['dashboards:read', 'incidents:write'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  scopes!: string[];

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ValidateApiKeyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rawKey!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requiredScope?: string;
}

export class ApiKeyQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

export class WebhookRetryPolicyDto {
  @ApiProperty({ default: 5 })
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts!: number;

  @ApiProperty({ default: 5000 })
  @IsInt()
  @Min(500)
  backoffMs!: number;
}

export class RegisterWebhookDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty({ type: [String], example: ['admin.incident.created'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  events!: string[];

  @ApiPropertyOptional({ type: WebhookRetryPolicyDto })
  @IsObject()
  @IsOptional()
  retryPolicy?: WebhookRetryPolicyDto;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  events?: string[];

  @ApiPropertyOptional({ type: WebhookRetryPolicyDto })
  @IsObject()
  @IsOptional()
  retryPolicy?: WebhookRetryPolicyDto;
}

export class WebhookQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateIncidentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ enum: IncidentSeverityEnum })
  @IsEnum(IncidentSeverityEnum)
  severity!: IncidentSeverityEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  affectedService!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatusEnum })
  @IsEnum(IncidentStatusEnum)
  status!: IncidentStatusEnum;
}

export class IncidentQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: IncidentStatusEnum })
  @IsEnum(IncidentStatusEnum)
  @IsOptional()
  status?: IncidentStatusEnum;

  @ApiPropertyOptional({ enum: IncidentSeverityEnum })
  @IsEnum(IncidentSeverityEnum)
  @IsOptional()
  severity?: IncidentSeverityEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  affectedService?: string;
}

export class CreateOverrideDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  featureKey!: string;

  @ApiProperty({ description: 'Arbitrary JSON value to apply for this tenant' })
  overrideValue!: any;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class SetFeatureAccessDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  featureKey!: string;

  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateAuditViewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  filterDefinition!: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class WidgetDataQueryDto {
  @ApiPropertyOptional({
    enum: ['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'],
  })
  @IsString()
  @IsOptional()
  timeRange?: string;
}

export class ConnectorLogQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'] })
  @IsString()
  @IsOptional()
  level?: string;
}
