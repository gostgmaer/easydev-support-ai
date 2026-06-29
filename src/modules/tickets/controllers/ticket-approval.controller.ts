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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketApprovalService } from '../services/ticket-approval.service';
import { RequestApprovalDto, DecideApprovalDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Ticket Approvals')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1')
export class TicketApprovalController {
  constructor(private readonly approvalService: TicketApprovalService) {}

  @Post('tickets/:ticketId/approvals')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Request an approval on a ticket' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Approval requested',
  })
  async request(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: RequestApprovalDto,
    @Req() req: any,
  ) {
    const approval = await this.approvalService.request(
      tenantId,
      ticketId,
      dto,
      req.user?.id,
    );
    return approval.toJSON();
  }

  @Get('tickets/:ticketId/approvals')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List approvals on a ticket' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const approvals = await this.approvalService.listApprovals(
      tenantId,
      ticketId,
    );
    return approvals.map((a) => a.toJSON());
  }

  @Post('approvals/:approvalId/approve')
  @Roles('tenant_admin', 'approver')
  @ApiOperation({ summary: 'Approve a pending approval' })
  async approve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: DecideApprovalDto,
    @Req() req: any,
  ) {
    const approval = await this.approvalService.approve(
      tenantId,
      approvalId,
      dto,
      req.user?.id,
    );
    return approval.toJSON();
  }

  @Post('approvals/:approvalId/reject')
  @Roles('tenant_admin', 'approver')
  @ApiOperation({ summary: 'Reject a pending approval' })
  async reject(
    @Headers('x-tenant-id') tenantId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: DecideApprovalDto,
    @Req() req: any,
  ) {
    const approval = await this.approvalService.reject(
      tenantId,
      approvalId,
      dto,
      req.user?.id,
    );
    return approval.toJSON();
  }

  @Post('approvals/:approvalId/cancel')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Cancel a pending approval' })
  async cancel(
    @Headers('x-tenant-id') tenantId: string,
    @Param('approvalId') approvalId: string,
    @Req() req: any,
  ) {
    const approval = await this.approvalService.cancel(
      tenantId,
      approvalId,
      req.user?.id,
    );
    return approval.toJSON();
  }
}
