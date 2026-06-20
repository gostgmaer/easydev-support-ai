import {
  Controller,
  Get,
  Post,
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
import { AdminAuditService } from '../services/admin-audit.service';
import { CreateAuditViewDto, AuditLogQueryDto, ConnectorLogQueryDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Admin Audit Center')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/admin/audit')
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  @Get('entities')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Entity change audit log' })
  async entityChanges(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.listEntityChanges(tenantId, this.toOptions(query));
  }

  @Get('settings')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Settings change audit log' })
  async settingsChanges(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.listSettingsChanges(tenantId, this.toOptions(query));
  }

  @Get('workflows')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Workflow change audit log' })
  async workflowChanges(
    @Headers('x-tenant-id') tenantId: string,
    @Query('workflowId') workflowId?: string,
    @Query('executionId') executionId?: string,
  ) {
    return this.auditService.listWorkflowChanges(tenantId, workflowId, executionId);
  }

  @Get('connectors/:connectorId')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Connector change/operational log' })
  async connectorChanges(
    @Headers('x-tenant-id') tenantId: string,
    @Param('connectorId') connectorId: string,
    @Query() query: ConnectorLogQueryDto,
  ) {
    return this.auditService.listConnectorChanges(tenantId, connectorId, query);
  }

  @Get('ai-configuration')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'AI configuration change audit log' })
  async aiConfigurationChanges(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.listAiConfigurationChanges(tenantId, this.toOptions(query));
  }

  @Get('api-keys')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'API key change audit log' })
  async apiKeyChanges(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.listApiKeyChanges(tenantId, this.toOptions(query));
  }

  @Get('security')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Security event audit log' })
  async securityEvents(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.listSecurityEvents(tenantId, this.toOptions(query));
  }

  @Get('views')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List saved audit views for the current user' })
  async listViews(@Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    const views = await this.auditService.listAuditViews(tenantId, this.userOf(req));
    return views.map((v) => v.toJSON());
  }

  @Post('views')
  @Roles('tenant_admin')
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Save an audit view' })
  async createView(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateAuditViewDto,
    @Req() req: any,
  ) {
    const view = await this.auditService.createAuditView(tenantId, this.userOf(req), dto);
    return view.toJSON();
  }

  @Delete('views/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Delete a saved audit view' })
  async deleteView(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.auditService.deleteAuditView(tenantId, id);
  }

  private toOptions(query: AuditLogQueryDto) {
    return {
      page: query.page,
      limit: query.limit,
      action: query.action,
      userId: query.userId,
      search: query.search,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
  }
}
