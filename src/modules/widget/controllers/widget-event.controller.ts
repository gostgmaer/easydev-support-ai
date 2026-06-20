import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { WidgetEventService } from '../services/widget-event.service';
import { TrackWidgetEventDto, TrackPageViewDto } from '../dtos/widget.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Widget Tracking')
@Controller('v1/widget/tracking')
export class WidgetEventController {
  constructor(private readonly eventService: WidgetEventService) {}

  @ApiOperation({ summary: 'Track widget interaction event (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('event')
  public async trackEvent(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: TrackWidgetEventDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const event = await this.eventService.trackEvent(tenantId, dto);
    return event.toJSON();
  }

  @ApiOperation({ summary: 'Track visitor page view (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('page-view')
  public async trackPageView(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: TrackPageViewDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const pv = await this.eventService.trackPageView(tenantId, dto);
    return pv.toJSON();
  }
}
