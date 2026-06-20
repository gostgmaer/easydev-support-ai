import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty({ example: 'ONLINE' })
  @IsString()
  status: string; // ONLINE, OFFLINE, AWAY

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  workingHours?: Record<string, any>;
}
