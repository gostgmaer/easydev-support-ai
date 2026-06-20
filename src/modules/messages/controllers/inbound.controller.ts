import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MessageInboundService } from '../services/message-inbound.service';
import { InboundMessageDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbound Messages')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbound-messages')
export class InboundController {
  constructor(private readonly inboundService: MessageInboundService) {}

  /**
   * Accepts a normalized inbound payload and immediately enqueues it. AI and
   * persistence run on the worker, never inside this request.
   */
  @Post()
  @Roles('tenant_admin', 'support_agent', 'channel_webhook')
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest an inbound message (async pipeline)' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Inbound message accepted' })
  async ingest(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: InboundMessageDto,
  ) {
    await this.inboundService.enqueueWebhook(tenantId, dto);
    return { accepted: true };
  }
}
