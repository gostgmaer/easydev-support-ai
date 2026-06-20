import {
  Controller,
  Get,
  Post,
  Put,
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
import { AgentProfileService } from '../services/agent-profile.service';
import {
  AgentProfileDto,
  UpdateAgentProfileDto,
  AgentProfileQueryDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Agent Profiles')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/agents')
export class AgentProfileController {
  constructor(private readonly agentService: AgentProfileService) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create an agent profile' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Agent profile created successfully',
  })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: AgentProfileDto,
    @Req() req: any,
  ) {
    const profile = await this.agentService.create(tenantId, dto, req.user?.id);
    return profile.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List and paginate agent profiles' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: AgentProfileQueryDto,
  ) {
    const result = await this.agentService.findPaginated(tenantId, query);
    return {
      data: result.data.map((p) => p.toJSON()),
      total: result.total,
    };
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get an agent profile by ID' })
  async findById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const profile = await this.agentService.findById(tenantId, id);
    return profile.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update an agent profile' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentProfileDto,
    @Req() req: any,
  ) {
    const profile = await this.agentService.update(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return profile.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an agent profile' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.agentService.delete(tenantId, id, req.user?.id);
  }
}
