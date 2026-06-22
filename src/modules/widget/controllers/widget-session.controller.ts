import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { WidgetSessionService } from '../services/widget-session.service';
import { StartWidgetSessionDto } from '../dtos/widget.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Widget Session')
@Controller('v1/widget/session')
export class WidgetSessionController {
  constructor(private readonly sessionService: WidgetSessionService) {}

  @ApiOperation({ summary: 'Start widget session (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('start')
  public async startSession(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: StartWidgetSessionDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const { session, token } = await this.sessionService.startSession(
      tenantId,
      dto,
    );
    return {
      session: session.toJSON(),
      token,
    };
  }

  @ApiOperation({ summary: 'End widget session (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('end')
  public async endSession(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { sessionId: string },
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    if (!body.sessionId) {
      throw new BadRequestException('Missing session ID');
    }
    await this.sessionService.endSession(tenantId, body.sessionId);
    return { success: true };
  }
}
