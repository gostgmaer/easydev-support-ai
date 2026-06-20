import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Support Tier 1' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Customer Success' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @IsOptional()
  priority?: number = 1;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
