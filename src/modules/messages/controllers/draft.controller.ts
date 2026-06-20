import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MessageDraftService } from '../services/message-draft.service';
import { SaveDraftDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Message Drafts')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/drafts')
export class DraftController {
  constructor(private readonly draftService: MessageDraftService) {}

  private authorOf(req: any): string {
    const authorId = req.user?.id;
    if (!authorId) {
      throw new BadRequestException('Authenticated author is required for drafts');
    }
    return authorId;
  }

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Create or update the authoring agent draft' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Draft saved' })
  async save(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SaveDraftDto,
    @Req() req: any,
  ) {
    const draft = await this.draftService.save(tenantId, this.authorOf(req), dto);
    return draft.toJSON();
  }

  @Get('conversation/:conversationId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List drafts on a conversation' })
  async listForConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const drafts = await this.draftService.listForConversation(
      tenantId,
      conversationId,
    );
    return drafts.map((d) => d.toJSON());
  }

  @Get('conversation/:conversationId/mine')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get the authoring agent draft on a conversation' })
  async mine(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const draft = await this.draftService.getForAuthor(
      tenantId,
      conversationId,
      this.authorOf(req),
    );
    return draft.toJSON();
  }

  @Post(':id/send')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Send a draft as a message' })
  async send(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('senderType') senderType: string,
    @Req() req: any,
  ) {
    const message = await this.draftService.send(
      tenantId,
      id,
      senderType || 'AGENT',
      req.user?.id,
    );
    return message.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin', 'support_agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Discard a draft' })
  async discard(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.draftService.discard(tenantId, id);
  }
}
