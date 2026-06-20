import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/conversations')
@UseGuards(TenantGuard, RbacGuard)
export class ConversationsController {
  @Get()
  @Roles('tenant_admin', 'manager', 'support_agent')
  async getConversations(@Headers('x-tenant-id') tenantId: string) {
    return []; // Fetched by UI to populate Unified Inbox History
  }

  @Get(':id/messages')
  @Roles('tenant_admin', 'manager', 'support_agent')
  async getMessages(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return [];
  }
}
