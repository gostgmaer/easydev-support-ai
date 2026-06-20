import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
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
import { InboxBookmarkService } from '../services/inbox-bookmark.service';
import { InboxSnoozeService } from '../services/inbox-snooze.service';
import { InboxActivityService } from '../services/inbox-activity.service';
import { SnoozeInboxDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbox Bookmarks & Snoozes')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox')
export class InboxBookmarkController {
  constructor(
    private readonly bookmarkService: InboxBookmarkService,
    private readonly snoozeService: InboxSnoozeService,
    private readonly activityService: InboxActivityService,
  ) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  @Get('bookmarks')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List bookmarked conversations for the agent' })
  async listBookmarks(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    return this.bookmarkService.list(tenantId, this.userOf(req));
  }

  @Post(':conversationId/bookmark')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Bookmark a conversation' })
  async bookmark(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.bookmarkService.bookmark(
      tenantId,
      conversationId,
      this.userOf(req),
    );
  }

  @Delete(':conversationId/bookmark')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Remove a conversation bookmark' })
  async removeBookmark(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.bookmarkService.removeBookmark(
      tenantId,
      conversationId,
      this.userOf(req),
    );
  }

  @Post(':conversationId/snooze')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Snooze a conversation until a future time' })
  async snooze(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SnoozeInboxDto,
    @Req() req: any,
  ) {
    return this.snoozeService.snooze(
      tenantId,
      conversationId,
      new Date(dto.snoozedUntil),
      dto.reason,
      this.userOf(req),
    );
  }

  @Delete(':conversationId/snooze')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Unsnooze a conversation' })
  async unsnooze(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    return this.snoozeService.unsnooze(
      tenantId,
      conversationId,
      this.userOf(req),
    );
  }

  @Get(':conversationId/activity')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get the activity feed for a conversation' })
  async activity(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.activityService.list(
      tenantId,
      conversationId,
      limit ? Number(limit) : 50,
    );
    return items.map((a) => a.toJSON());
  }
}
