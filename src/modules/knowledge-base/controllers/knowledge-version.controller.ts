import { Controller, Get, Param, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KnowledgeVersionService } from '../services/knowledge-version.service';

@Controller('v1/knowledge-versions')
@UseGuards(TenantGuard, RbacGuard)
export class KnowledgeVersionController {
  constructor(
    private readonly versionService: KnowledgeVersionService,
  ) {}

  @Get('document/:documentId')
  @Roles('tenant_admin', 'agent')
  public async getVersions(
    @Headers('x-tenant-id') tenantId: string,
    @Param('documentId') documentId: string,
  ) {
    const versions = await this.versionService.getVersions(tenantId, documentId);
    return versions.map((v) => v.toJSON());
  }
}
