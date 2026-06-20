import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkflowTypeEnum,
  WorkflowStatusEnum,
  TriggerTypeEnum,
  ActionTypeEnum,
  ApprovalStatusEnum,
} from '../domain/value-objects';

export class TriggerConfigDto {
  @IsEnum(TriggerTypeEnum)
  triggerType: TriggerTypeEnum;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

export class ConditionConfigDto {
  @IsString()
  field: string;

  @IsString()
  operator: string; // EQUALS, CONTAINS, GT, LT

  @IsString()
  value: string;
}

export class ActionConfigDto {
  @IsEnum(ActionTypeEnum)
  actionType: ActionTypeEnum;

  @IsObject()
  configuration: Record<string, any>;

  @IsNumber()
  sequenceOrder: number;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WorkflowTypeEnum)
  workflowType: WorkflowTypeEnum;

  @IsOptional()
  @IsEnum(WorkflowStatusEnum)
  status?: WorkflowStatusEnum;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerConfigDto)
  triggers?: TriggerConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionConfigDto)
  conditions?: ConditionConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionConfigDto)
  actions?: ActionConfigDto[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, { type: string; value: string }>;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatusEnum)
  status?: WorkflowStatusEnum;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerConfigDto)
  triggers?: TriggerConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionConfigDto)
  conditions?: ConditionConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionConfigDto)
  actions?: ActionConfigDto[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, { type: string; value: string }>;
}

export class ExecuteWorkflowDto {
  @IsString()
  workflowId: string;

  @IsOptional()
  @IsString()
  triggerSource?: string;

  @IsOptional()
  @IsString()
  triggerReferenceId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ApproveRejectDto {
  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreateScheduleDto {
  @IsString()
  workflowId: string;

  @IsString()
  cronExpression: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
