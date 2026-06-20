import { Controller, Get, Post, Put, Delete, Body, Headers, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ConnectorService } from '../services/connector.service';
import { ConnectorCredentialService } from '../services/connector-credential.service';
import { ConnectorHealthService } from '../services/connector-health.service';
import { ConnectorImportService } from '../services/connector-import.service';
import {
  InstallConnectorDto,
  ConfigureConnectorDto,
  CreateInstanceDto,
  MapCapabilitiesDto,
  ImportOpenApiDto,
  ConfigureOAuthDto,
  ConfigureApiKeyDto,
} from '../dtos/connector.dto';
import { AuthTypeEnum } from '../domain/value-objects';

@Controller('v1/connectors')
@UseGuards(TenantGuard, RbacGuard)
export class ConnectorsController {
  constructor(
    private readonly connectorService: ConnectorService,
    private readonly credentialService: ConnectorCredentialService,
    private readonly healthService: ConnectorHealthService,
    private readonly importService: ConnectorImportService,
  ) {}

  @Post('install')
  @Roles('tenant_admin')
  public async installConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: InstallConnectorDto,
  ) {
    const connector = await this.connectorService.installConnector(tenantId, dto);
    return connector.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin')
  public async updateConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConfigureConnectorDto,
  ) {
    const connector = await this.connectorService.updateConnector(tenantId, id, dto);
    return connector.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'agent')
  public async getConnectors(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: any,
  ) {
    const result = await this.connectorService.getConnectors(tenantId, query);
    return {
      data: result.data.map((c) => c.toJSON()),
      total: result.total,
    };
  }

  @Get(':id')
  @Roles('tenant_admin', 'agent')
  public async getConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const connector = await this.connectorService.getConnector(tenantId, id);
    return connector.toJSON();
  }

  @Post(':id/activate')
  @Roles('tenant_admin')
  public async activateConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const connector = await this.connectorService.activateConnector(tenantId, id);
    return connector.toJSON();
  }

  @Post(':id/pause')
  @Roles('tenant_admin')
  public async pauseConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const connector = await this.connectorService.pauseConnector(tenantId, id);
    return connector.toJSON();
  }

  @Post(':id/disable')
  @Roles('tenant_admin')
  public async disableConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const connector = await this.connectorService.disableConnector(tenantId, id);
    return connector.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteConnector(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.connectorService.deleteConnector(tenantId, id);
  }

  @Post('import/openapi')
  @Roles('tenant_admin')
  public async importOpenApi(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ImportOpenApiDto,
  ) {
    const connector = await this.importService.importOpenApi(tenantId, dto);
    return connector.toJSON();
  }

  @Post('import/swagger')
  @Roles('tenant_admin')
  public async importSwagger(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ImportOpenApiDto,
  ) {
    const connector = await this.importService.importOpenApi(tenantId, dto);
    return connector.toJSON();
  }

  @Post(':id/oauth')
  @Roles('tenant_admin')
  public async configureOAuth(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConfigureOAuthDto,
  ) {
    const expiresAt = dto.expiresIn ? new Date(Date.now() + dto.expiresIn * 1000) : undefined;
    const credential = await this.credentialService.saveCredential(
      tenantId,
      id,
      AuthTypeEnum.OAUTH2,
      dto,
      { expiresAt },
    );
    return { status: 'configured', credentialId: credential.id };
  }

  @Post(':id/apikey')
  @Roles('tenant_admin')
  public async configureApiKey(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConfigureApiKeyDto,
  ) {
    const credential = await this.credentialService.saveCredential(
      tenantId,
      id,
      AuthTypeEnum.API_KEY,
      dto,
    );
    return { status: 'configured', credentialId: credential.id };
  }

  @Post(':id/capabilities')
  @Roles('tenant_admin')
  public async mapCapabilities(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: MapCapabilitiesDto,
  ) {
    const connector = await this.connectorService.mapCapabilities(tenantId, id, dto);
    return connector.toJSON();
  }

  @Post(':id/health')
  @Roles('tenant_admin')
  public async checkHealth(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const isHealthy = await this.healthService.checkHealth(tenantId, id);
    return { isHealthy };
  }

  @Post(':id/instances')
  @Roles('tenant_admin')
  public async createInstance(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateInstanceDto,
  ) {
    const instance = await this.connectorService.createInstance(tenantId, id, dto);
    return instance.toJSON();
  }

  @Get(':id/instances')
  @Roles('tenant_admin', 'agent')
  public async getInstances(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const instances = await this.connectorService.getInstances(tenantId, id);
    return instances.map((inst) => inst.toJSON());
  }

  @Delete('instances/:instanceId')
  @Roles('tenant_admin')
  public async deleteInstance(
    @Headers('x-tenant-id') tenantId: string,
    @Param('instanceId') instanceId: string,
  ) {
    const success = await this.connectorService.deleteInstance(tenantId, instanceId);
    return { success };
  }
}
