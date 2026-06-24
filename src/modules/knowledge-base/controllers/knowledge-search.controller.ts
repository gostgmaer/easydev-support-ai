import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { SearchQueryDto } from '../dtos/knowledge.dto';

@Controller('v1/knowledge-search')
@UseGuards(TenantGuard, RbacGuard)
export class KnowledgeSearchController {
  constructor(private readonly searchService: KnowledgeSearchService) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  public async search(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SearchQueryDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role?: string,
    @Headers('x-user-team-id') teamId?: string,
  ) {
    return this.searchService.search(tenantId, dto, userId, teamId, role);
  }
}
