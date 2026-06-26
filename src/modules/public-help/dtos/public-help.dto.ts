import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { TicketPriorityEnum } from '../../tickets/domain/value-objects';

export class PublicSearchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class CreatePublicTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Visitor email - used to find or create the customer record',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TicketPriorityEnum })
  @IsEnum(TicketPriorityEnum)
  @IsOptional()
  priority?: TicketPriorityEnum;

  @ApiPropertyOptional({
    description: 'Free-text category label chosen by the visitor',
  })
  @IsString()
  @IsOptional()
  category?: string;
}
