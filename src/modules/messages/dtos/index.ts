import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsInt,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEmail,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MessageTypeEnum,
  MessageDirectionEnum,
  MessageStatusEnum,
} from '../domain/value-objects';

export class CreateMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  conversationId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  senderId?: string;

  @ApiProperty({ example: 'AGENT' })
  @IsString()
  senderType!: string;

  @ApiPropertyOptional({ enum: MessageTypeEnum, default: MessageTypeEnum.TEXT })
  @IsEnum(MessageTypeEnum)
  @IsOptional()
  messageType?: MessageTypeEnum;

  @ApiPropertyOptional({
    enum: MessageDirectionEnum,
    default: MessageDirectionEnum.OUTBOUND,
  })
  @IsEnum(MessageDirectionEnum)
  @IsOptional()
  direction?: MessageDirectionEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentHtml?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  replyToMessageId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  threadId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateMessageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentHtml?: string;

  @ApiPropertyOptional({ enum: MessageStatusEnum })
  @IsEnum(MessageStatusEnum)
  @IsOptional()
  status?: MessageStatusEnum;
}

export class ReplyMessageDto {
  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({ enum: MessageTypeEnum })
  @IsEnum(MessageTypeEnum)
  @IsOptional()
  messageType?: MessageTypeEnum;

  @ApiProperty({ example: 'AGENT' })
  @IsString()
  senderType!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  senderId?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

export class MessageQueryDto {
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
  cursor?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsEnum({ ASC: 'ASC', DESC: 'DESC' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ enum: MessageDirectionEnum })
  @IsEnum(MessageDirectionEnum)
  @IsOptional()
  direction?: MessageDirectionEnum;

  @ApiPropertyOptional({ enum: MessageStatusEnum })
  @IsEnum(MessageStatusEnum)
  @IsOptional()
  status?: MessageStatusEnum;

  @ApiPropertyOptional({ enum: MessageTypeEnum })
  @IsEnum(MessageTypeEnum)
  @IsOptional()
  messageType?: MessageTypeEnum;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  threadId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}

export class ReactMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: '👍' })
  @IsString()
  reaction!: string;
}

export class MentionMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  mentionedUserId!: string;
}

export class BulkMessageOperationDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  messageIds!: string[];

  @ApiProperty({ enum: MessageStatusEnum })
  @IsEnum(MessageStatusEnum)
  status!: MessageStatusEnum;
}

export class RegisterAttachmentDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @ApiProperty({
    description: 'Reference id returned by the File Upload Service',
  })
  @IsString()
  uploadReference!: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  channelType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentHtml?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

export class TemplateQueryDto {
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
  category?: string;
}

export class SaveDraftDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  conversationId!: string;

  @ApiProperty()
  @IsString()
  draftContent!: string;

  @ApiPropertyOptional({ default: 'TEXT' })
  @IsString()
  @IsOptional()
  draftType?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class StartWidgetConversationDto {
  @ApiPropertyOptional({
    description:
      'Visitor email - required only when starting a new conversation (omit to resume an existing one)',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;
}

export class SendWidgetMessageDto {
  @ApiProperty()
  @IsString()
  content!: string;
}

export class CreateWidgetTicketDto {
  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
  @IsOptional()
  priority?: string;
}

export class InboundMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  channelId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalMessageId?: string;

  @ApiPropertyOptional({ enum: MessageTypeEnum })
  @IsEnum(MessageTypeEnum)
  @IsOptional()
  messageType?: MessageTypeEnum;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
