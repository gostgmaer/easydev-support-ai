import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/workflows')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowsController {
  @Get()
  @Roles('tenant_admin', 'manager')
  getWorkflows() {
    return [];
  }

  @Post()
  @Roles('tenant_admin')
  createWorkflow() {
    return { status: 'created' };
  }
}
