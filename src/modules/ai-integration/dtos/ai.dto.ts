import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { AgentTypeEnum, AgentStatusEnum, EscalationTargetEnum } from '../domain/value-objects';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  public name: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsEnum(AgentTypeEnum)
  @IsNotEmpty()
  public agentType: AgentTypeEnum;

  @IsString()
  @IsOptional()
  public defaultWorkflow?: string;

  @IsString()
  @IsOptional()
  public systemPromptReference?: string;

  @IsObject()
  @IsOptional()
  public configuration?: Record<string, any>;
}

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  public name?: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsEnum(AgentStatusEnum)
  @IsOptional()
  public status?: AgentStatusEnum;

  @IsString()
  @IsOptional()
  public defaultWorkflow?: string;

  @IsString()
  @IsOptional()
  public systemPromptReference?: string;

  @IsObject()
  @IsOptional()
  public configuration?: Record<string, any>;
}

export class AgentProfileDto {
  @IsObject()
  @IsOptional()
  public knowledgeScope?: Record<string, any>;

  @IsObject()
  @IsOptional()
  public connectorScope?: Record<string, any>;

  @IsArray()
  @IsOptional()
  public languageSupport?: string[];

  @IsObject()
  @IsOptional()
  public escalationRules?: Record<string, any>;

  @IsObject()
  @IsOptional()
  public configuration?: Record<string, any>;
}

export class ModelConfigDto {
  @IsString()
  @IsNotEmpty()
  public modelName: string;

  @IsString()
  @IsNotEmpty()
  public provider: string;

  @IsNumber()
  @Min(0.0)
  @Max(2.0)
  public temperature: number;

  @IsNumber()
  @Min(1)
  public maxTokens: number;

  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  public topP: number;

  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  public presencePenalty: number;

  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  public frequencyPenalty: number;

  @IsArray()
  @IsOptional()
  public stopSequences?: string[];
}

export class TriggerWorkflowDto {
  @IsString()
  @IsNotEmpty()
  public workflowId: string;

  @IsString()
  @IsNotEmpty()
  public conversationId: string;

  @IsObject()
  @IsOptional()
  public variables?: Record<string, any>;
}

export class SubmitToolResultDto {
  @IsString()
  @IsNotEmpty()
  public toolRequestId: string;

  @IsObject()
  @IsNotEmpty()
  public response: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  public status: 'SUCCESS' | 'FAILED';
}

export class CreateEscalationDto {
  @IsString()
  @IsNotEmpty()
  public conversationId: string;

  @IsString()
  @IsNotEmpty()
  public reason: string;

  @IsNumber()
  @IsOptional()
  @Min(0.0)
  @Max(1.0)
  public confidenceScore?: number;

  @IsNumber()
  @IsOptional()
  @Min(-1.0)
  @Max(1.0)
  public sentimentScore?: number;

  @IsEnum(EscalationTargetEnum)
  @IsNotEmpty()
  public escalatedTo: EscalationTargetEnum;
}

export class ResolveEscalationDto {
  @IsString()
  @IsOptional()
  public notes?: string;
}
