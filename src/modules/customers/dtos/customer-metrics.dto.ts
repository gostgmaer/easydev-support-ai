import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CustomerMetricsDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  totalConversations?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  totalTickets?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  totalOrders?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  totalSpend?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  averageCsat?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  averageResponseTime?: number; // seconds

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  averageResolutionTime?: number; // seconds

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sentimentScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  lifetimeValue?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  riskScore?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  vipStatus?: boolean;
}
