import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChannelWebhookService } from '../services/channel-webhook.service';
import { ChannelWebhookDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Channel Webhooks')
@Controller('v1/channels/:channelId/webhooks')
export class ChannelWebhookController {
  constructor(private readonly webhookService: ChannelWebhookService) {}

  @Post()
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Register webhook endpoints for channel updates' })
  async register(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Body() dto: ChannelWebhookDto,
    @Req() req: any,
  ) {
    const webhook = await this.webhookService.registerWebhook(
      tenantId,
      channelId,
      dto,
      req.user?.id,
    );
    return webhook.toJSON();
  }

  @Get()
  @ApiOperation({
    summary: 'Verify webhook challenge token from external providers',
  })
  async verify(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Query() query: Record<string, any>,
  ) {
    return this.webhookService.verifyWebhook(tenantId, channelId, query);
  }

  @Post('receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive incoming webhook triggers from channel providers',
  })
  async receive(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Body() payload: any,
    @Headers() headers: Record<string, any>,
    @Req() req?: any,
  ) {
    // Note: We return 200 OK instantly to avoid provider timeouts,
    // and queue message validation & routing processes asynchronously.
    await this.webhookService.handleIncomingWebhook(
      tenantId,
      channelId,
      payload,
      headers,
      req?.rawBody,
    );
    return { status: 'queued' };
  }
}
