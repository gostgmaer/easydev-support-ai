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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { TeamService } from '../services/team.service';
import { CreateTeamDto, UpdateTeamDto, TeamQueryDto, AssignAgentDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Teams')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Team created successfully' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateTeamDto,
    @Req() req: any
  ) {
    const team = await this.teamService.create(tenantId, dto, req.user?.id);
    return team.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List, filter, and paginate teams' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: TeamQueryDto
  ) {
    const result = await this.teamService.findPaginated(tenantId, query);
    return {
      data: result.data.map((t) => t.toJSON()),
      total: result.total,
    };
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a team by ID' })
  async findById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const team = await this.teamService.findById(tenantId, id);
    return team.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update an existing team' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: any
  ) {
    const team = await this.teamService.update(tenantId, id, dto, req.user?.id);
    return team.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a team' })
  async archive(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any
  ) {
    await this.teamService.archive(tenantId, id, req.user?.id);
  }

  @Post(':id/agents')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Add an agent to a team' })
  async addAgent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
    @Req() req: any
  ) {
    await this.teamService.addAgent(tenantId, id, dto.agentProfileId, dto.role, req.user?.id);
    return { success: true };
  }

  @Delete(':id/agents/:agentProfileId')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an agent from a team' })
  async removeAgent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('agentProfileId') agentProfileId: string,
    @Req() req: any
  ) {
    await this.teamService.removeAgent(tenantId, id, agentProfileId, req.user?.id);
  }

  @Post(':id/transfer')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Transfer an agent to another team' })
  async transfer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('toTeamId') toTeamId: string,
    @Body('agentProfileId') agentProfileId: string,
    @Req() req: any
  ) {
    await this.teamService.moveAgent(tenantId, id, toTeamId, agentProfileId, req.user?.id);
    return { success: true };
  }
}
