import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class AssignAgentDto {
  @ApiProperty()
  @IsUUID()
  agentProfileId: string;

  @ApiPropertyOptional({ default: 'MEMBER' })
  @IsString()
  @IsOptional()
  role?: string = 'MEMBER';
}

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'LEADER' })
  @IsString()
  @IsNotEmpty()
  role!: string;
}
