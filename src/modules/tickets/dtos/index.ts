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
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TicketStatusEnum,
  TicketPriorityEnum,
  TicketSourceEnum,
} from '../domain/value-objects';
import {
  ApprovalStatusEnum,
  ApprovalTypeEnum,
} from '../domain/ticket-approval.entity';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedTeamId?: string;

  @ApiPropertyOptional({ enum: TicketPriorityEnum })
  @IsEnum(TicketPriorityEnum)
  @IsOptional()
  priority?: TicketPriorityEnum;

  @ApiPropertyOptional({ enum: TicketSourceEnum })
  @IsEnum(TicketSourceEnum)
  @IsOptional()
  source?: TicketSourceEnum;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TicketPriorityEnum })
  @IsEnum(TicketPriorityEnum)
  @IsOptional()
  priority?: TicketPriorityEnum;

  @ApiPropertyOptional({ enum: TicketStatusEnum })
  @IsEnum(TicketStatusEnum)
  @IsOptional()
  status?: TicketStatusEnum;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TicketQueryDto {
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

  @ApiPropertyOptional({ enum: TicketStatusEnum })
  @IsEnum(TicketStatusEnum)
  @IsOptional()
  status?: TicketStatusEnum;

  @ApiPropertyOptional({ enum: TicketPriorityEnum })
  @IsEnum(TicketPriorityEnum)
  @IsOptional()
  priority?: TicketPriorityEnum;

  @ApiPropertyOptional({ enum: TicketSourceEnum })
  @IsEnum(TicketSourceEnum)
  @IsOptional()
  source?: TicketSourceEnum;

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
  categoryId?: string;

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

export class AssignTicketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  agentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignmentType?: string;
}

export class AutoAssignTicketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId!: string;
}

export class TransferTicketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAgentId!: string;
}

export class EscalateTicketDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}

export class ResolveTicketDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resolutionSummary?: string;
}

export class AddTicketCommentDto {
  @ApiProperty()
  @IsString()
  comment!: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'INTERNAL'], default: 'PUBLIC' })
  @IsString()
  @IsOptional()
  visibility?: string;
}

export class AddTicketAttachmentDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileType?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  fileSize?: number;

  @ApiProperty({ description: 'Reference id from the File Upload Service' })
  @IsString()
  uploadReference!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  commentId?: string;
}

export class WatchTicketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  notificationPreferences?: Record<string, any>;
}

export class TagTicketDto {
  @ApiProperty()
  @IsString()
  tag!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;
}

export class RequestApprovalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  approverId!: string;

  @ApiPropertyOptional({
    enum: ApprovalTypeEnum,
    default: ApprovalTypeEnum.CUSTOM,
  })
  @IsEnum(ApprovalTypeEnum)
  @IsOptional()
  type?: ApprovalTypeEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string;
}

export class DecideApprovalDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string;
}

export class BulkTicketStatusDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  ticketIds!: string[];

  @ApiProperty({ enum: TicketStatusEnum })
  @IsEnum(TicketStatusEnum)
  status!: TicketStatusEnum;
}

export class MergeTicketsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetId!: string;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ConfigureSlaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  policyId?: string;

  @ApiPropertyOptional({ description: 'Response target in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  responseMinutes?: number;

  @ApiPropertyOptional({ description: 'Resolution target in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  resolutionMinutes?: number;

  @ApiPropertyOptional({
    description: 'Apply business-hours calendar to SLA targets',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  businessHours?: boolean;
}

export class SplitTicketDto {
  @ApiProperty({ description: 'The ID of the conversation message / comment from which to split the ticket' })
  @IsUUID()
  messageId!: string;

  @ApiPropertyOptional({ description: 'Optional new subject for the split-off ticket' })
  @IsString()
  @IsOptional()
  newSubject?: string;
}
