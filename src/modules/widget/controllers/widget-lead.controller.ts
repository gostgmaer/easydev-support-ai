import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { WidgetLeadService } from '../services/widget-lead.service';
import { CaptureLeadDto } from '../dtos/widget.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Widget Leads')
@Controller('v1/widget/lead')
export class WidgetLeadController {
  constructor(private readonly leadService: WidgetLeadService) {}

  @ApiOperation({ summary: 'Capture lead details (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('capture')
  public async captureLead(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CaptureLeadDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const lead = await this.leadService.captureLead(tenantId, dto);
    return lead.toJSON();
  }
}
