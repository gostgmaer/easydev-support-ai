import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { WorkflowExecutionService } from '../services/workflow-execution.service';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { ExecuteWorkflowDto } from '../dtos/workflow.dto';

@Controller('v1/workflows/executions')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowExecutionController {
  constructor(
    private readonly executionService: WorkflowExecutionService,
    private readonly templateService: WorkflowTemplateService,
    private readonly engineService: WorkflowEngineService,
  ) {}

  @Post()
  @Roles('tenant_admin', 'manager')
  public async executeWorkflow(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    const template = await this.templateService.getTemplate(
      tenantId,
      dto.workflowId,
    );
    const executionId = await this.engineService.runWorkflowTemplate(
      tenantId,
      template,
      dto.context || {},
      dto.triggerSource || 'MANUAL',
    );
    const execution = await this.executionService.getExecution(
      tenantId,
      executionId,
    );
    return execution.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'manager', 'agent')
  public async getExecution(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const execution = await this.executionService.getExecution(tenantId, id);
    return execution.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'manager', 'agent')
  public async findExecutions(
    @Headers('x-tenant-id') tenantId: string,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
  ) {
    const executions = await this.executionService.findExecutions(tenantId, {
      workflowId,
      status,
    });
    return executions.map((e) => e.toJSON());
  }
}
