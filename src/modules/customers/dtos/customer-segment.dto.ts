import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CustomerSegmentDto {
  @ApiProperty({ example: 'High Value Customers' })
  @IsString()
  segmentName: string;

  @ApiProperty({ example: 'DYNAMIC', enum: ['STATIC', 'DYNAMIC'] })
  @IsEnum(['STATIC', 'DYNAMIC'])
  segmentType: 'STATIC' | 'DYNAMIC';

  @ApiPropertyOptional({ example: { spend: { gt: 1000 } } })
  @IsObject()
  @IsOptional()
  rules?: any;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
