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
  Min,
  Max,
  ArrayMaxSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InboxStatusEnum,
  InboxPriorityEnum,
  PresenceStatusEnum,
} from '../domain/value-objects';

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsEnum({ ASC: 'ASC', DESC: 'DESC' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ enum: InboxStatusEnum })
  @IsEnum(InboxStatusEnum)
  @IsOptional()
  status?: InboxStatusEnum;

  @ApiPropertyOptional({ enum: InboxPriorityEnum })
  @IsEnum(InboxPriorityEnum)
  @IsOptional()
  priority?: InboxPriorityEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sentiment?: string;

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
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  unassigned?: boolean;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  highPriority?: boolean;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  aiEscalated?: boolean;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  slaRisk?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  bookmarkedByUserId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}

export class InboxSearchDto {
  @ApiProperty()
  @IsString()
  query!: string;

  @ApiPropertyOptional({ enum: InboxStatusEnum })
  @IsEnum(InboxStatusEnum)
  @IsOptional()
  status?: InboxStatusEnum;

  @ApiPropertyOptional({ enum: InboxPriorityEnum })
  @IsEnum(InboxPriorityEnum)
  @IsOptional()
  priority?: InboxPriorityEnum;

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
}

export class AssignInboxDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  agentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  teamId?: string;
}

export class TransferInboxDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAgentId!: string;
}

export class RoundRobinAssignDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId!: string;
}

export class AssignTeamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId!: string;
}

export class BulkAssignDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  conversationIds!: string[];

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  agentId!: string;
}

export class SnoozeInboxDto {
  @ApiProperty({ description: 'ISO timestamp until which to snooze' })
  @IsDateString()
  snoozedUntil!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PresenceDto {
  @ApiProperty({ enum: PresenceStatusEnum })
  @IsEnum(PresenceStatusEnum)
  status!: PresenceStatusEnum;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  activeConversationId?: string;
}

export class CreateFilterDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  filterDefinition!: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}

export class CreateSavedViewDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  filterId!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  sortConfiguration?: Record<string, any>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  columnConfiguration?: Record<string, any>;
}

export class ReplayWorkflowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workflowId!: string;
}

export class RetryConnectorDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  executionId!: string;
}

export class AiDraftDecisionDto {
  @ApiProperty()
  @IsString()
  draftId!: string;

  @ApiProperty()
  @IsBoolean()
  approved!: boolean;
}
