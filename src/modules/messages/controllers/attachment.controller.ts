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
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MessageAttachmentService } from '../services/message-attachment.service';
import { RegisterAttachmentDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Message Attachments')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1')
export class AttachmentController {
  constructor(private readonly attachmentService: MessageAttachmentService) {}

  @Post('messages/:messageId/attachments')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Register an uploaded file as a message attachment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Attachment registered' })
  async register(
    @Headers('x-tenant-id') tenantId: string,
    @Param('messageId') messageId: string,
    @Body() dto: RegisterAttachmentDto,
    @Req() req: any,
  ) {
    const attachment = await this.attachmentService.register(
      tenantId,
      messageId,
      dto,
      req.user?.id,
    );
    return attachment.toJSON();
  }

  @Get('messages/:messageId/attachments')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List attachments for a message' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('messageId') messageId: string,
  ) {
    const attachments = await this.attachmentService.list(tenantId, messageId);
    return attachments.map((a) => a.toJSON());
  }

  @Get('attachments/:attachmentId/signed-url')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Generate a signed URL for an attachment' })
  async signedUrl(
    @Headers('x-tenant-id') tenantId: string,
    @Param('attachmentId') attachmentId: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    return this.attachmentService.getSignedUrl(
      tenantId,
      attachmentId,
      expiresIn ? parseInt(expiresIn, 10) : undefined,
    );
  }

  @Delete('attachments/:attachmentId')
  @Roles('tenant_admin', 'support_agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    await this.attachmentService.delete(tenantId, attachmentId, req.user?.id);
  }
}
