import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationNoteService } from '../services/conversation-note.service';
import { AddNoteDto, MentionUserDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Conversation Notes')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/conversations/:conversationId/notes')
export class ConversationNoteController {
  constructor(private readonly noteService: ConversationNoteService) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Add an internal note to a conversation' })
  async addNote(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: AddNoteDto,
    @Req() req: any,
  ) {
    const note = await this.noteService.addNote(tenantId, conversationId, dto, req.user?.id);
    return note.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List internal notes for a conversation' })
  async list(@Headers('x-tenant-id') tenantId: string, @Param('conversationId') conversationId: string) {
    const notes = await this.noteService.listNotes(tenantId, conversationId);
    return notes.map((n) => n.toJSON());
  }

  @Post('mentions')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Mention a user in a conversation' })
  async mention(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: MentionUserDto,
    @Req() req: any,
  ) {
    const mention = await this.noteService.mention(tenantId, conversationId, dto, req.user?.id);
    return mention.toJSON();
  }

  @Get('mentions')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List mentions for a conversation' })
  async listMentions(@Headers('x-tenant-id') tenantId: string, @Param('conversationId') conversationId: string) {
    const mentions = await this.noteService.listMentions(tenantId, conversationId);
    return mentions.map((m) => m.toJSON());
  }
}
