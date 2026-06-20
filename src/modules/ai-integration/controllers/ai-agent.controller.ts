import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AiAgentService } from '../services/ai-agent.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  AgentProfileDto,
  ModelConfigDto,
} from '../dtos/ai.dto';

@Controller('v1/ai-agents')
@UseGuards(TenantGuard, RbacGuard)
export class AiAgentController {
  constructor(private readonly agentService: AiAgentService) {}

  @Post()
  @Roles('tenant_admin')
  public async createAgent(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateAgentDto,
  ) {
    const agent = await this.agentService.createAgent(tenantId, dto);
    return agent.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'agent')
  public async getAgent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const agent = await this.agentService.getAgent(tenantId, id);
    return agent.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'agent')
  public async findAgents(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: any,
  ) {
    const agents = await this.agentService.findAgents(tenantId, query);
    return agents.map((a) => a.toJSON());
  }

  @Put(':id')
  @Roles('tenant_admin')
  public async updateAgent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    const agent = await this.agentService.updateAgent(tenantId, id, dto);
    return agent.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  public async deleteAgent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.agentService.deleteAgent(tenantId, id);
    return { success: true };
  }

  @Put(':id/profile')
  @Roles('tenant_admin')
  public async setProfile(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AgentProfileDto,
  ) {
    const agent = await this.agentService.setAgentProfile(tenantId, id, dto);
    return agent.toJSON();
  }

  @Put(':id/model-config')
  @Roles('tenant_admin')
  public async setModelConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ModelConfigDto,
  ) {
    const agent = await this.agentService.setAgentModelConfig(
      tenantId,
      id,
      dto,
    );
    return agent.toJSON();
  }
}
