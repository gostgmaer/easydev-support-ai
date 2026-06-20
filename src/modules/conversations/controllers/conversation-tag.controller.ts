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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationTagService } from '../services/conversation-tag.service';
import { TagConversationDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Conversation Tags')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/conversations/:conversationId/tags')
export class ConversationTagController {
  constructor(private readonly tagService: ConversationTagService) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Add a tag to a conversation' })
  async addTag(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: TagConversationDto,
    @Req() req: any,
  ) {
    const tag = await this.tagService.addTag(tenantId, conversationId, dto, req.user?.id);
    return tag.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List tags for a conversation' })
  async list(@Headers('x-tenant-id') tenantId: string, @Param('conversationId') conversationId: string) {
    const tags = await this.tagService.listTags(tenantId, conversationId);
    return tags.map((t) => t.toJSON());
  }

  @Delete(':tag')
  @Roles('tenant_admin', 'support_agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag from a conversation' })
  async remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Param('tag') tag: string,
    @Req() req: any,
  ) {
    await this.tagService.removeTag(tenantId, conversationId, tag, req.user?.id);
  }
}
