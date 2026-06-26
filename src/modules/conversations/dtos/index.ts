import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConversationStatusEnum,
  ConversationPriorityEnum,
  ConversationSentimentEnum,
} from '../domain/value-objects';

export class CreateConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedTeamId?: string;

  @ApiPropertyOptional({ enum: ConversationPriorityEnum })
  @IsEnum(ConversationPriorityEnum)
  @IsOptional()
  priority?: ConversationPriorityEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'API' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateConversationDto extends PartialType(CreateConversationDto) {
  @ApiPropertyOptional({ enum: ConversationStatusEnum })
  @IsEnum(ConversationStatusEnum)
  @IsOptional()
  status?: ConversationStatusEnum;

  @ApiPropertyOptional({ enum: ConversationSentimentEnum })
  @IsEnum(ConversationSentimentEnum)
  @IsOptional()
  sentiment?: ConversationSentimentEnum;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsEnum({ ASC: 'ASC', DESC: 'DESC' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ enum: ConversationStatusEnum })
  @IsEnum(ConversationStatusEnum)
  @IsOptional()
  status?: ConversationStatusEnum;

  @ApiPropertyOptional({ enum: ConversationPriorityEnum })
  @IsEnum(ConversationPriorityEnum)
  @IsOptional()
  priority?: ConversationPriorityEnum;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedTeamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  unassigned?: boolean;
}

export class InboxQueryDto {
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

  @ApiPropertyOptional({ enum: ConversationStatusEnum })
  @IsEnum(ConversationStatusEnum)
  @IsOptional()
  status?: ConversationStatusEnum;

  @ApiPropertyOptional({ enum: ConversationPriorityEnum })
  @IsEnum(ConversationPriorityEnum)
  @IsOptional()
  priority?: ConversationPriorityEnum;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedTeamId?: string;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  unassigned?: boolean;
}

export class AssignConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  agentProfileId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignmentType?: string;
}

export class AutoAssignConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId!: string;
}

export class TransferConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAgentProfileId!: string;
}

export class TagConversationDto {
  @ApiProperty()
  @IsString()
  tag!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSystemTag?: boolean;
}

export class BulkResolveDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  conversationIds!: string[];
}

export class BulkCloseDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  conversationIds!: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkTagDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  conversationIds!: string[];

  @ApiProperty()
  @IsString()
  tag!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;
}

export class AddNoteDto {
  @ApiProperty()
  @IsString()
  note!: string;

  @ApiPropertyOptional({ enum: ['INTERNAL', 'PRIVATE'] })
  @IsString()
  @IsOptional()
  visibility?: string;
}

export class MentionUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  mentionedUserId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageReference?: string;
}

export class MergeConversationsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetId!: string;
}
