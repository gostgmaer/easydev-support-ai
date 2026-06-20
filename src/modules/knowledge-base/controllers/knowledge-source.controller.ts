import { Controller, Get, Post, Put, Delete, Body, Headers, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KnowledgeSourceService } from '../services/knowledge-source.service';
import { KnowledgeSyncService } from '../services/knowledge-sync.service';
import { CreateSourceDto, UpdateSourceDto } from '../dtos/knowledge.dto';

@Controller('v1/knowledge-sources')
@UseGuards(TenantGuard, RbacGuard)
export class KnowledgeSourceController {
  constructor(
    private readonly sourceService: KnowledgeSourceService,
    private readonly syncService: KnowledgeSyncService,
  ) {}

  @Post()
  @Roles('tenant_admin')
  public async createSource(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateSourceDto,
  ) {
    const source = await this.sourceService.createSource(tenantId, dto);
    return source.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'agent')
  public async getSource(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const source = await this.sourceService.getSource(tenantId, id);
    return source.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'agent')
  public async findSources(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: any,
  ) {
    const result = await this.sourceService.findSources(tenantId, query);
    return {
      data: result.data.map((s) => s.toJSON()),
      total: result.total,
    };
  }

  @Put(':id')
  @Roles('tenant_admin')
  public async updateSource(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSourceDto,
  ) {
    const source = await this.sourceService.updateSource(tenantId, id, dto);
    return source.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteSource(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.sourceService.deleteSource(tenantId, id);
  }

  @Post(':id/sync')
  @Roles('tenant_admin')
  public async triggerSync(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.syncService.triggerWebsiteCrawl(tenantId, id);
    return { status: 'sync_triggered' };
  }
}
