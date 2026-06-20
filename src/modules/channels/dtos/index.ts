import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChannelTypeEnum } from '../domain/value-objects';

export class CreateChannelDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ChannelTypeEnum })
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @ApiProperty()
  @IsString()
  provider: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateChannelDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ChannelQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ChannelTypeEnum })
  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  type?: ChannelTypeEnum;

  @ApiPropertyOptional({ default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string;
}

export class ChannelConfigurationDto {
  @ApiProperty()
  @IsString()
  authenticationType: string;

  @ApiProperty()
  @IsObject()
  configuration: Record<string, any>;

  @ApiProperty()
  @IsObject()
  credentials: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class ChannelWebhookDto {
  @ApiProperty()
  @IsString()
  webhookUrl: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  verificationToken?: string;
}

export class ChannelTemplateDto {
  @ApiProperty()
  @IsString()
  templateName: string;

  @ApiProperty()
  @IsString()
  templateType: string;

  @ApiProperty()
  @IsString()
  templateContent: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}
