import {
  Controller,
  Get,
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
import { WorkflowApprovalService } from '../services/workflow-approval.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { ApproveRejectDto } from '../dtos/workflow.dto';

@Controller('v1/workflows/approvals')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowApprovalController {
  constructor(
    private readonly approvalService: WorkflowApprovalService,
    private readonly engineService: WorkflowEngineService,
  ) {}

  @Get(':id')
  @Roles('tenant_admin', 'manager', 'support_agent')
  public async getApproval(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const approval = await this.approvalService.getApproval(tenantId, id);
    return approval.toJSON();
  }

  @Get('execution/:executionId')
  @Roles('tenant_admin', 'manager', 'support_agent')
  public async getApprovalsForExecution(
    @Headers('x-tenant-id') tenantId: string,
    @Param('executionId') executionId: string,
  ) {
    const approvals = await this.approvalService.getApprovalsForExecution(
      tenantId,
      executionId,
    );
    return approvals.map((a) => a.toJSON());
  }

  @Post(':id/approve')
  @Roles('tenant_admin', 'manager')
  public async approve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Req() req: any,
  ) {
    const approverId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    const approval = await this.approvalService.approve(
      tenantId,
      id,
      dto.comments,
    );
    await this.engineService.resumeExecution(
      tenantId,
      approval.workflowExecutionId,
      true,
      approverId,
      dto.comments,
    );
    return approval.toJSON();
  }

  @Post(':id/reject')
  @Roles('tenant_admin', 'manager')
  public async reject(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Req() req: any,
  ) {
    const approverId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    const approval = await this.approvalService.reject(
      tenantId,
      id,
      dto.comments,
    );
    await this.engineService.resumeExecution(
      tenantId,
      approval.workflowExecutionId,
      false,
      approverId,
      dto.comments,
    );
    return approval.toJSON();
  }
}
