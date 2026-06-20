import { Controller, Get, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';

@Controller('v1/knowledge')
@UseGuards(TenantGuard, RbacGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeIngestionService) {}

  @Post('ingest')
  @Roles('tenant_admin')
  async ingestDocument(@Headers('x-tenant-id') tenantId: string, @Body() body: { url: string, type: string }) {
    return this.knowledgeService.ingestDocument(tenantId, body.url, body.type);
  }
}
