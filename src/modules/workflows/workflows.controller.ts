import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/workflows')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowsController {
  @Get()
  @Roles('tenant_admin', 'manager')
  async getWorkflows(@Headers('x-tenant-id') tenantId: string) {
    return [];
  }

  @Post()
  @Roles('tenant_admin')
  async createWorkflow(
    @Headers('x-tenant-id') tenantId: string,
    @Body() workflowDefinition: any,
  ) {
    return { status: 'created' };
  }
}
