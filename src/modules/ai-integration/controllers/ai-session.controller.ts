import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Headers,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AiConversationService } from '../services/ai-conversation.service';
import { AiResponseService } from '../services/ai-response.service';

@Controller('v1/ai-sessions')
@UseGuards(TenantGuard, RbacGuard)
export class AiSessionController {
  constructor(
    private readonly conversationService: AiConversationService,
    private readonly responseService: AiResponseService,
  ) {}

  @Get('conversation/:conversationId')
  @Roles('tenant_admin', 'support_agent')
  public async getSession(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const session = await this.conversationService.getOrCreateSession(
      tenantId,
      conversationId,
      'cust-default-id', // default
      'agent-default-id', // default
    );
    return session.toJSON();
  }

  @Put('conversation/:conversationId/state')
  @Roles('tenant_admin', 'support_agent')
  public async updateSessionState(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() state: Record<string, any>,
  ) {
    const session = await this.conversationService.updateSessionState(
      tenantId,
      conversationId,
      state,
    );
    return session.toJSON();
  }

  @Post('conversation/:conversationId/suggest')
  @Roles('tenant_admin', 'support_agent')
  public async suggestDraft(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.responseService.generateDraftSuggestion(
      tenantId,
      conversationId,
      req.user?.id,
    );
  }
}
