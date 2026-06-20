import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsArray, IsUrl, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorTypeEnum, AuthTypeEnum, CapabilityTypeEnum } from '../domain/value-objects';

export class InstallConnectorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(ConnectorTypeEnum)
  connectorType: ConnectorTypeEnum;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  baseUrl?: string;

  @IsEnum(AuthTypeEnum)
  authType: AuthTypeEnum;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ConfigureConnectorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  baseUrl?: string;

  @IsEnum(AuthTypeEnum)
  @IsOptional()
  authType?: AuthTypeEnum;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateInstanceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ImportOpenApiDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(ConnectorTypeEnum)
  connectorType: ConnectorTypeEnum;

  @IsObject()
  spec: Record<string, any>;
}

export class ConfigureOAuthDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsUrl()
  @IsNotEmpty()
  tokenUrl: string;

  @IsUrl()
  @IsOptional()
  authUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsNumber()
  @IsOptional()
  expiresIn?: number;
}

export class ConfigureApiKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  headerName: string;
}

export class ConfigureWebhookDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsString()
  @IsOptional()
  signatureHeader?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  events?: string[];
}

export class CapabilityMappingItemDto {
  @IsEnum(CapabilityTypeEnum)
  capabilityType: CapabilityTypeEnum;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsObject()
  @IsOptional()
  requestMapping?: Record<string, any>;

  @IsObject()
  @IsOptional()
  responseMapping?: Record<string, any>;

  @IsObject()
  @IsOptional()
  inputSchema?: Record<string, any>;

  @IsObject()
  @IsOptional()
  outputSchema?: Record<string, any>;
}

export class MapCapabilitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapabilityMappingItemDto)
  capabilities: CapabilityMappingItemDto[];
}

export class ExecuteCapabilityDto {
  @IsObject()
  @IsOptional()
  params?: Record<string, any>;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  ticketId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
