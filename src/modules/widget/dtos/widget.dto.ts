import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsEmail,
  IsObject,
  IsNumber,
  IsUUID,
  IsUrl,
} from 'class-validator';

export class CreateWidgetConfigDto {
  @ApiProperty({ description: 'Name of the widget' })
  @IsString()
  @IsNotEmpty()
  widgetName: string;

  @ApiPropertyOptional({ description: 'Theme mode (light/dark/etc.)', default: 'light' })
  @IsString()
  @IsOptional()
  theme?: string;

  @ApiPropertyOptional({ description: 'Primary theme color', default: '#000000' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Secondary theme color', default: '#ffffff' })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Position on screen', default: 'bottom-right' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ description: 'Welcome greeting message' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Offline fallback message' })
  @IsString()
  @IsOptional()
  offlineMessage?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Custom CSS override' })
  @IsString()
  @IsOptional()
  customCss?: string;

  @ApiPropertyOptional({ description: 'Custom JavaScript code' })
  @IsString()
  @IsOptional()
  customJs?: string;

  @ApiPropertyOptional({ description: 'Allowed domains for widget embedding', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];
}

export class UpdateWidgetConfigDto {
  @ApiPropertyOptional({ description: 'Name of the widget' })
  @IsString()
  @IsOptional()
  widgetName?: string;

  @ApiPropertyOptional({ description: 'Theme mode (light/dark/etc.)' })
  @IsString()
  @IsOptional()
  theme?: string;

  @ApiPropertyOptional({ description: 'Primary theme color' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Secondary theme color' })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Position on screen' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ description: 'Welcome greeting message' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Offline fallback message' })
  @IsString()
  @IsOptional()
  offlineMessage?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Custom CSS override' })
  @IsString()
  @IsOptional()
  customCss?: string;

  @ApiPropertyOptional({ description: 'Custom JavaScript code' })
  @IsString()
  @IsOptional()
  customJs?: string;

  @ApiPropertyOptional({ description: 'Allowed domains for widget embedding', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];
}

export class StartWidgetSessionDto {
  @ApiProperty({ description: 'Anonymous or identified visitor ID' })
  @IsString()
  @IsNotEmpty()
  anonymousId: string;

  @ApiPropertyOptional({ description: 'Metadata context like IP address hash' })
  @IsString()
  @IsOptional()
  ipAddressHash?: string;

  @ApiPropertyOptional({ description: 'HTTP User-Agent header' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Device type (desktop, mobile, etc.)' })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Web browser details' })
  @IsString()
  @IsOptional()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiPropertyOptional({ description: 'Referrer URL' })
  @IsString()
  @IsOptional()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Landing page URL' })
  @IsString()
  @IsOptional()
  landingPage?: string;
}

export class IdentifyVisitorDto {
  @ApiProperty({ description: 'Visitor anonymous identifier' })
  @IsString()
  @IsNotEmpty()
  anonymousId: string;

  @ApiPropertyOptional({ description: 'External user unique ID from client CRM/auth' })
  @IsString()
  @IsOptional()
  externalUserId?: string;

  @ApiPropertyOptional({ description: 'Visitor email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Visitor name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Visitor phone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Country location' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'City location' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Verification method used' })
  @IsString()
  @IsOptional()
  verificationMethod?: string;

  @ApiPropertyOptional({ description: 'Verification signature / secure hash' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class CaptureLeadDto {
  @ApiPropertyOptional({ description: 'Name of the lead' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({ description: 'Capture source (e.g. pre-chat, lead-form)' })
  @IsString()
  @IsNotEmpty()
  source: string;
}

export class CreateInstallationDto {
  @ApiProperty({ description: 'Domain name for the installation script verification' })
  @IsString()
  @IsNotEmpty()
  domain: string;
}

export class VerifyInstallationDto {
  @ApiProperty({ description: 'Verification token provided to client domain' })
  @IsString()
  @IsNotEmpty()
  verificationToken: string;
}

export class TrackWidgetEventDto {
  @ApiProperty({ description: 'Widget session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Event name (e.g., PAGE_VIEW, CHAT_OPENED)' })
  @IsString()
  @IsNotEmpty()
  eventName: string;

  @ApiPropertyOptional({ description: 'JSON metadata for the event', type: Object })
  @IsObject()
  @IsOptional()
  eventData?: Record<string, any>;
}

export class TrackPageViewDto {
  @ApiProperty({ description: 'Widget session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Current URL page location' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Page Title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Time spent in seconds', default: 0 })
  @IsNumber()
  @IsOptional()
  timeSpentSeconds?: number;
}
