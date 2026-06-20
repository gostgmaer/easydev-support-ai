import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { WorkflowAuditService } from '../services/workflow-audit.service';

@Controller('v1/workflows/audit')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowAuditController {
  constructor(private readonly auditService: WorkflowAuditService) {}

  @Get()
  @Roles('tenant_admin', 'manager')
  public async getAuditLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Query('workflowId') workflowId?: string,
    @Query('executionId') executionId?: string,
  ) {
    const logs = await this.auditService.getAuditLogs(
      tenantId,
      workflowId,
      executionId,
    );
    return logs;
  }
}
