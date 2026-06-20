import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsInt, IsNumber, IsArray, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class AgentProfileDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @IsOptional()
  capacity?: number = 10;

  @ApiPropertyOptional({ default: 5 })
  @IsInt()
  @IsOptional()
  maxConcurrentConversations?: number = 5;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @IsOptional()
  maxOpenTickets?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  skillScore?: number = 0;

  @ApiPropertyOptional({ default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string = 'UTC';

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languagePreferences?: string[] = ['en'];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAgentProfileDto extends PartialType(AgentProfileDto) {}

export class AgentProfileQueryDto {
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string;
}
