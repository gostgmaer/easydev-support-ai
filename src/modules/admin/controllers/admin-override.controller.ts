import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminOverrideService } from '../services/admin-override.service';
import {
  CreateOverrideDto,
  SetFeatureAccessDto,
  ConnectorLogQueryDto,
} from '../dtos';
import { UpdateAiSettingsDto } from '../../settings/dtos/settings.dto';
import {
  UpdateAgentDto,
  ModelConfigDto,
} from '../../ai-integration/dtos/ai.dto';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Admin Tenant Overrides & Governance')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/admin/overrides')
export class AdminOverrideController {
  constructor(private readonly overrideService: AdminOverrideService) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId)
      throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  @Get()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List tenant overrides' })
  async list(@Headers('x-tenant-id') tenantId: string) {
    const overrides = await this.overrideService.listOverrides(tenantId);
    return overrides.map((o) => o.toJSON());
  }

  @Post()
  @Roles('tenant_admin')
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Create or replace a tenant override' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateOverrideDto,
    @Req() req: any,
  ) {
    const override = await this.overrideService.createOverride(
      tenantId,
      dto,
      this.userOf(req),
    );
    return override.toJSON();
  }

  @Get(':featureKey')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get an override by feature key' })
  async getByKey(
    @Headers('x-tenant-id') tenantId: string,
    @Param('featureKey') featureKey: string,
  ) {
    const override = await this.overrideService.getOverride(
      tenantId,
      featureKey,
    );
    return override.toJSON();
  }

  @Delete(':featureKey')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Remove an override' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('featureKey') featureKey: string,
    @Req() req: any,
  ) {
    return this.overrideService.deleteOverride(
      tenantId,
      featureKey,
      this.userOf(req),
    );
  }

  @Get('feature-access/list')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List feature access entitlements' })
  async listFeatureAccess(@Headers('x-tenant-id') tenantId: string) {
    const access = await this.overrideService.listFeatureAccess(tenantId);
    return access.map((a) => a.toJSON());
  }

  @Post('feature-access')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Grant or revoke feature access' })
  async setFeatureAccess(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SetFeatureAccessDto,
    @Req() req: any,
  ) {
    const access = await this.overrideService.setFeatureAccess(
      tenantId,
      dto,
      this.userOf(req),
    );
    return access.toJSON();
  }

  @Get('governance/ai')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'AI governance: settings, limits and today usage' })
  async getAiGovernance(@Headers('x-tenant-id') tenantId: string) {
    return this.overrideService.getAiGovernance(tenantId);
  }

  @Patch('governance/ai')
  @Roles('tenant_admin')
  @ApiOperation({
    summary: 'Update AI governance settings (limits, thresholds, model)',
  })
  async updateAiGovernance(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateAiSettingsDto,
    @Req() req: any,
  ) {
    return this.overrideService.updateAiGovernance(
      tenantId,
      dto,
      this.userOf(req),
    );
  }

  @Get('governance/ai/agents')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List AI agent configurations' })
  async listAgentConfigurations(@Headers('x-tenant-id') tenantId: string) {
    return this.overrideService.listAgentConfigurations(tenantId);
  }

  @Patch('governance/ai/agents/:agentId')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update an AI agent configuration' })
  async updateAgentConfiguration(
    @Headers('x-tenant-id') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentDto,
    @Req() req: any,
  ) {
    return this.overrideService.updateAgentConfiguration(
      tenantId,
      agentId,
      dto,
      this.userOf(req),
    );
  }

  @Patch('governance/ai/agents/:agentId/model')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update an AI agent model configuration' })
  async updateAgentModelConfiguration(
    @Headers('x-tenant-id') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: ModelConfigDto,
    @Req() req: any,
  ) {
    return this.overrideService.updateAgentModelConfiguration(
      tenantId,
      agentId,
      dto,
      this.userOf(req),
    );
  }

  @Get('governance/connectors/:connectorId')
  @Roles('tenant_admin')
  @ApiOperation({
    summary: 'Connector governance: health, rate limits, failures, retries',
  })
  async getConnectorGovernance(
    @Headers('x-tenant-id') tenantId: string,
    @Param('connectorId') connectorId: string,
  ) {
    return this.overrideService.getConnectorGovernance(tenantId, connectorId);
  }

  @Get('governance/connectors/:connectorId/logs')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Connector governance: audit logs' })
  async getConnectorAuditLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Param('connectorId') connectorId: string,
    @Query() query: ConnectorLogQueryDto,
  ) {
    return this.overrideService.getConnectorAuditLogs(
      tenantId,
      connectorId,
      query,
    );
  }
}
