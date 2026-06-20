import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelHealthService } from '../services/channel-health.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Channel Health')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/channels/:channelId/health')
export class ChannelHealthController {
  constructor(private readonly healthService: ChannelHealthService) {}

  @Post('check')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Trigger a health status and connection check' })
  async checkHealth(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string
  ) {
    return this.healthService.checkHealth(tenantId, channelId);
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get current channel health status' })
  async getHealth(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string
  ) {
    return this.healthService.getHealth(tenantId, channelId);
  }
}
