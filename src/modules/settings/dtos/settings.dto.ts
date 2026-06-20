import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsUrl,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateTenantSettingsDto {
  @ApiProperty({ description: 'The name of the tenant' })
  @IsString()
  tenantName: string;

  @ApiPropertyOptional({ description: 'Industry of the tenant' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Timezone', default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Locale code', default: 'en' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ description: 'Country of operations' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Primary currency', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Support email' })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'Support contact phone' })
  @IsString()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Settings metadata', type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ description: 'The name of the tenant' })
  @IsString()
  @IsOptional()
  tenantName?: string;

  @ApiPropertyOptional({ description: 'Industry of the tenant' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Locale code' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ description: 'Country of operations' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Primary currency' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Support email' })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'Support contact phone' })
  @IsString()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Settings status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Settings metadata', type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateBrandingDto {
  @ApiPropertyOptional({ description: 'URL of the company logo' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'URL of the site favicon' })
  @IsUrl()
  @IsOptional()
  faviconUrl?: string;

  @ApiPropertyOptional({
    description: 'Primary brand hex color',
    default: '#000000',
  })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Secondary brand hex color',
    default: '#ffffff',
  })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Theme mode', default: 'LIGHT' })
  @IsString()
  @IsOptional()
  themeMode?: string;

  @ApiPropertyOptional({ description: 'Email template header HTML' })
  @IsString()
  @IsOptional()
  emailHeader?: string;

  @ApiPropertyOptional({ description: 'Email template footer HTML' })
  @IsString()
  @IsOptional()
  emailFooter?: string;

  @ApiPropertyOptional({ description: 'Custom CSS override' })
  @IsString()
  @IsOptional()
  customCss?: string;
}

export class SaveBusinessHoursDto {
  @ApiProperty({ description: 'Day of week (0 = Sunday, 6 = Saturday)' })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time of day (HH:MM:ss)',
    default: '09:00:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time of day (HH:MM:ss)',
    default: '17:00:00',
  })
  @IsString()
  endTime: string;

  @ApiProperty({
    description: 'Flag whether business is open on this day',
    default: true,
  })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({ description: 'Timezone for business hours', default: 'UTC' })
  @IsString()
  timezone: string;
}

export class SaveHolidayDto {
  @ApiProperty({ description: 'Descriptive name of the holiday' })
  @IsString()
  holidayName: string;

  @ApiProperty({ description: 'Date of the holiday' })
  @IsDateString()
  holidayDate: string;

  @ApiProperty({
    description: 'Flag indicating if holiday recurs annually',
    default: false,
  })
  @IsBoolean()
  isRecurring: boolean;

  @ApiPropertyOptional({ description: 'Associated country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Associated state/region' })
  @IsString()
  @IsOptional()
  region?: string;
}

export class SaveFeatureFlagDto {
  @ApiProperty({ description: 'Unique feature identifier key' })
  @IsString()
  featureKey: string;

  @ApiProperty({
    description: 'Flag indicating whether feature is enabled',
    default: false,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Percentage rollout (0 - 100)', default: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage: number;

  @ApiPropertyOptional({
    description: 'Custom flag configuration parameters',
    type: Object,
  })
  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({ description: 'Default AI agent profile ID' })
  @IsString()
  @IsOptional()
  defaultAgent?: string;

  @ApiPropertyOptional({
    description: 'Confidence threshold for auto responses',
    default: 0.7,
  })
  @IsNumber()
  @IsOptional()
  confidenceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Confidence threshold below which to trigger human escalation',
    default: 0.4,
  })
  @IsNumber()
  @IsOptional()
  escalationThreshold?: number;

  @ApiPropertyOptional({
    description: 'List of allowed ISO language codes',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  allowedLanguages?: string[];

  @ApiPropertyOptional({
    description: 'Default fallback language code',
    default: 'en',
  })
  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @ApiPropertyOptional({
    description: 'Auto response active flag',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  autoResponseEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Auto escalation active flag',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  autoEscalationEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Daily AI model cost budget limit' })
  @IsNumber()
  @IsOptional()
  costLimitDaily?: number;

  @ApiPropertyOptional({ description: 'Monthly AI model cost budget limit' })
  @IsNumber()
  @IsOptional()
  costLimitMonthly?: number;

  @ApiPropertyOptional({
    description: 'Custom LLM model configurations',
    type: Object,
  })
  @IsOptional()
  modelConfiguration?: Record<string, any>;
}

export class UpdateChannelSettingsDto {
  @ApiProperty({
    description:
      'The communication channel type (EMAIL, WEB_CHAT, SMS, WHATSAPP, etc.)',
  })
  @IsString()
  channelType: string;

  @ApiProperty({
    description: 'Flag whether channel is enabled',
    default: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Flag whether channel only functions inside business hours',
    default: false,
  })
  @IsBoolean()
  businessHoursOnly: boolean;

  @ApiProperty({
    description: 'Flag whether auto routing and assignment is active',
    default: true,
  })
  @IsBoolean()
  autoAssignmentEnabled: boolean;

  @ApiPropertyOptional({
    description: 'Custom integration configurations',
    type: Object,
  })
  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Flag whether email notices are active' })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Flag whether SMS notices are active' })
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Flag whether mobile push notifications are active',
  })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Flag whether outgoing webhook triggers are active',
  })
  @IsBoolean()
  @IsOptional()
  webhookEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Flag whether daily/weekly notifications summary is active',
  })
  @IsBoolean()
  @IsOptional()
  digestEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Notification templating parameters',
    type: Object,
  })
  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateSlaSettingsDto {
  @ApiPropertyOptional({
    description: 'Target initial response time (seconds)',
  })
  @IsNumber()
  @IsOptional()
  responseTimeTarget?: number;

  @ApiPropertyOptional({ description: 'Target case resolution time (seconds)' })
  @IsNumber()
  @IsOptional()
  resolutionTimeTarget?: number;

  @ApiPropertyOptional({
    description: 'Target case escalation alert time (seconds)',
  })
  @IsNumber()
  @IsOptional()
  escalationTimeTarget?: number;

  @ApiPropertyOptional({
    description: 'Calculate SLA timers only during active business hours',
  })
  @IsBoolean()
  @IsOptional()
  businessHoursOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Custom SLA tier policies configuration',
    type: Object,
  })
  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateSecuritySettingsDto {
  @ApiPropertyOptional({
    description: 'Session inactivity timeout limit (seconds)',
  })
  @IsNumber()
  @IsOptional()
  sessionTimeout?: number;

  @ApiPropertyOptional({
    description: 'List of allowed client IP CIDR ranges',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  ipWhitelist?: string[];

  @ApiPropertyOptional({ description: 'Require Multi-Factor Authentication' })
  @IsBoolean()
  @IsOptional()
  mfaRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Force API key renewal frequency (days)',
  })
  @IsNumber()
  @IsOptional()
  apiKeyRotationDays?: number;

  @ApiPropertyOptional({ description: 'Audit log retention duration (days)' })
  @IsNumber()
  @IsOptional()
  auditRetentionDays?: number;

  @ApiPropertyOptional({
    description: 'Custom security policies config',
    type: Object,
  })
  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateWidgetSettingsDto {
  @ApiPropertyOptional({ description: 'Live Chat Widget descriptive title' })
  @IsString()
  @IsOptional()
  widgetName?: string;

  @ApiPropertyOptional({ description: 'Primary brand color for widget body' })
  @IsString()
  @IsOptional()
  widgetColor?: string;

  @ApiPropertyOptional({
    description: 'Widget floating position (e.g. BOTTOM_RIGHT)',
  })
  @IsString()
  @IsOptional()
  widgetPosition?: string;

  @ApiPropertyOptional({ description: 'Initial welcome message for users' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({
    description: 'Automated offline message when business is closed',
  })
  @IsString()
  @IsOptional()
  offlineMessage?: string;

  @ApiPropertyOptional({ description: 'Default assistant avatar URL' })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Widget custom CSS override styles' })
  @IsString()
  @IsOptional()
  customCss?: string;

  @ApiPropertyOptional({ description: 'Widget custom JavaScript actions' })
  @IsString()
  @IsOptional()
  customJs?: string;
}

export class UpdateUsageLimitsDto {
  @ApiPropertyOptional({
    description: 'Maximum allowed concurrent active human agents count',
  })
  @IsNumber()
  @IsOptional()
  maxAgents?: number;

  @ApiPropertyOptional({ description: 'Maximum allowed conversations limit' })
  @IsNumber()
  @IsOptional()
  maxConversations?: number;

  @ApiPropertyOptional({ description: 'Maximum allowed total messages limit' })
  @IsNumber()
  @IsOptional()
  maxMessages?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed active workflows count',
  })
  @IsNumber()
  @IsOptional()
  maxWorkflows?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed active connector instances',
  })
  @IsNumber()
  @IsOptional()
  maxConnectors?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed knowledge base documents count',
  })
  @IsNumber()
  @IsOptional()
  maxDocuments?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed file storage space allocation (bytes)',
  })
  @IsNumber()
  @IsOptional()
  maxStorage?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed monthly AI queries limit',
  })
  @IsNumber()
  @IsOptional()
  maxAiRequests?: number;
}
