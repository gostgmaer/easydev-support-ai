import { Controller, Get, Post, Body, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ConnectorExecutionService } from '../services/connector-execution.service';
import { ExecuteCapabilityDto } from '../dtos/connector.dto';
import { CapabilityTypeEnum } from '../domain/value-objects';

@Controller('v1/connectors')
@UseGuards(TenantGuard, RbacGuard)
export class ConnectorExecutionsController {
  constructor(
    private readonly executionService: ConnectorExecutionService,
  ) {}

  @Post('executions/execute')
  @Roles('tenant_admin', 'agent')
  public async executeCapability(
    @Headers('x-tenant-id') tenantId: string,
    @Query('capabilityType') capabilityType: CapabilityTypeEnum,
    @Body() dto: ExecuteCapabilityDto,
  ) {
    const result = await this.executionService.executeCapability(
      tenantId,
      capabilityType,
      dto.params || {},
      {
        workflowId: dto.workflowId,
        conversationId: dto.conversationId,
        ticketId: dto.ticketId,
        idempotencyKey: dto.idempotencyKey,
      },
    );
    return { success: true, result };
  }

  @Get(':id/executions')
  @Roles('tenant_admin', 'agent')
  public async getExecutions(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') connectorId: string,
    @Query() query: any,
  ) {
    const result = await this.executionService.getExecutions(tenantId, connectorId, query);
    return {
      data: result.data.map((exec) => exec.toJSON()),
      total: result.total,
    };
  }

  @Get('executions/:executionId')
  @Roles('tenant_admin', 'agent')
  public async getExecution(
    @Headers('x-tenant-id') tenantId: string,
    @Param('executionId') executionId: string,
  ) {
    const execution = await this.executionService.getExecution(tenantId, executionId);
    return execution.toJSON();
  }
}
