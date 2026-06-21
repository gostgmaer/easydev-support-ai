import {
  Controller,
  Get,
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
import { InboxService } from '../services/inbox.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

/**
 * REST companion for the Socket.IO realtime gateway. The live stream itself is
 * served by InboxRealtimeService on the /v1/inbox/realtime namespace; this
 * controller exposes connection metadata and a counters snapshot for clients
 * bootstrapping the realtime view.
 */
@ApiTags('Inbox Realtime')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox/realtime')
export class InboxRealtimeController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('info')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Realtime connection metadata' })
  info() {
    return {
      namespace: '/v1/inbox/realtime',
      transport: 'socket.io',
      events: [
        'inbox.conversation.updated',
        'inbox.message.updated',
        'inbox.assignment.updated',
        'inbox.presence.updated',
        'inbox.status.changed',
        'inbox.counters',
        'inbox.typing',
        'inbox.read-receipt',
        'ticket.updated',
        'ai.escalation.updated',
        'ai.session.updated',
        'workflow.execution.updated',
      ],
    };
  }

  @Get('counters')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Counters snapshot for realtime bootstrap' })
  async counters(@Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user is required');
    return this.inboxService.getCounters(tenantId, userId);
  }
}
