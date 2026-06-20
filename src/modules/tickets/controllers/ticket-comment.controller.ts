import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
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
import { Throttle } from '@nestjs/throttler';
import { TicketCommentService } from '../services/ticket-comment.service';
import { AddTicketCommentDto, AddTicketAttachmentDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Ticket Comments')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/tickets/:ticketId')
export class TicketCommentController {
  constructor(private readonly commentService: TicketCommentService) {}

  private authorOf(req: any): string {
    const authorId = req.user?.id;
    if (!authorId) {
      throw new BadRequestException('Authenticated author is required');
    }
    return authorId;
  }

  @Post('comments')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Add a comment to a ticket (public or internal)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment added' })
  async addComment(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: AddTicketCommentDto,
    @Req() req: any,
  ) {
    const comment = await this.commentService.addComment(
      tenantId,
      ticketId,
      dto,
      this.authorOf(req),
    );
    return comment.toJSON();
  }

  @Get('comments')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List ticket comments' })
  async listComments(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const comments = await this.commentService.listComments(tenantId, ticketId);
    return comments.map((c) => c.toJSON());
  }

  @Post('attachments')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Register an uploaded file on a ticket' })
  async addAttachment(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: AddTicketAttachmentDto,
    @Req() req: any,
  ) {
    const attachment = await this.commentService.addAttachment(
      tenantId,
      ticketId,
      dto,
      req.user?.id,
    );
    return attachment.toJSON();
  }

  @Get('attachments')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List ticket attachments' })
  async listAttachments(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const attachments = await this.commentService.listAttachments(
      tenantId,
      ticketId,
    );
    return attachments.map((a) => a.toJSON());
  }
}
