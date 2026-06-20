import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AiWorkflowService } from '../services/ai-workflow.service';
import { TriggerWorkflowDto } from '../dtos/ai.dto';

@Controller('v1/ai-workflows')
@UseGuards(TenantGuard, RbacGuard)
export class AiWorkflowController {
  constructor(private readonly workflowService: AiWorkflowService) {}

  @Post('trigger')
  @Roles('tenant_admin', 'agent')
  public async triggerWorkflow(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: TriggerWorkflowDto,
  ) {
    const execution = await this.workflowService.triggerWorkflow(
      tenantId,
      dto.workflowId,
      dto.conversationId,
      dto.variables,
    );
    return execution.toJSON();
  }

  @Get('execution/:id')
  @Roles('tenant_admin', 'agent')
  public async getExecution(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const execution = await this.workflowService.getExecution(tenantId, id);
    return execution.toJSON();
  }
}
