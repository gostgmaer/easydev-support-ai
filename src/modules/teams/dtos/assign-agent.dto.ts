import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class AssignAgentDto {
  @ApiProperty()
  @IsUUID()
  agentProfileId: string;

  @ApiPropertyOptional({ default: 'MEMBER' })
  @IsString()
  @IsOptional()
  role?: string = 'MEMBER';
}
