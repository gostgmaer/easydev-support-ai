import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InboxPresenceService } from '../services/inbox-presence.service';
import { PresenceDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbox Presence')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox/presence')
export class InboxPresenceController {
  constructor(private readonly presenceService: InboxPresenceService) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Set the current agent presence status' })
  async setPresence(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: PresenceDto,
    @Req() req: any,
  ) {
    const presence = await this.presenceService.setPresence(
      tenantId,
      this.userOf(req),
      dto.status,
      dto.activeConversationId,
    );
    return presence.toJSON();
  }

  @Post('heartbeat')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Send a presence heartbeat' })
  async heartbeat(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    await this.presenceService.heartbeat(tenantId, this.userOf(req));
    return { ok: true };
  }

  @Get('me')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get the current agent presence' })
  async me(@Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    const presence = await this.presenceService.getPresence(
      tenantId,
      this.userOf(req),
    );
    return presence ? presence.toJSON() : null;
  }

  @Get('online')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List online agents in the tenant' })
  async online(@Headers('x-tenant-id') tenantId: string) {
    return this.presenceService.listOnline(tenantId);
  }
}
