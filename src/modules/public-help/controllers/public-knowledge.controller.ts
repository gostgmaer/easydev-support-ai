import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { KnowledgeCategoryService } from '../../knowledge-base/services/knowledge-category.service';
import { KnowledgeDocumentService } from '../../knowledge-base/services/knowledge-document.service';
import { KnowledgeSearchService } from '../../knowledge-base/services/knowledge-search.service';
import { DocumentStatusEnum } from '../../knowledge-base/domain/value-objects';
import { SearchQueryDto } from '../../knowledge-base/dtos/knowledge.dto';
import { PublicSearchDto } from '../dtos/public-help.dto';

/** Public, unauthenticated knowledge-base read surface for help-center -
 * the existing knowledge-base controllers all require an agent/admin IAM
 * role (TenantGuard + RbacGuard), which anonymous customers never have.
 * Every method here only ever returns ACTIVE (published) content. */
@ApiTags('Public Help Center')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('v1/public/knowledge')
export class PublicKnowledgeController {
  constructor(
    private readonly categoryService: KnowledgeCategoryService,
    private readonly documentService: KnowledgeDocumentService,
    private readonly searchService: KnowledgeSearchService,
  ) {}

  private requireTenant(tenantId: string): void {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
  }

  @ApiOperation({ summary: 'List knowledge categories (public)' })
  @Get('categories')
  async listCategories(@Headers('x-tenant-id') tenantId: string) {
    this.requireTenant(tenantId);
    const categories = await this.categoryService.findCategories(tenantId);
    return categories.map((c) => c.toJSON());
  }

  @ApiOperation({ summary: 'List published articles (public)' })
  @Get('documents')
  async listDocuments(
    @Headers('x-tenant-id') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('documentType') documentType?: string,
  ) {
    this.requireTenant(tenantId);
    const result = await this.documentService.findDocuments(tenantId, {
      categoryId,
      status: DocumentStatusEnum.ACTIVE,
      limit: 100,
    });
    const docs = documentType
      ? result.data.filter((d: any) => d.documentType === documentType)
      : result.data;
    return docs.map((d: any) => d.toJSON());
  }

  @ApiOperation({ summary: 'Get a published article by slug (public)' })
  @Get('documents/:slug')
  async getDocumentBySlug(
    @Headers('x-tenant-id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    this.requireTenant(tenantId);
    const doc = await this.documentService.getDocumentBySlug(tenantId, slug);
    if (doc.status.value !== DocumentStatusEnum.ACTIVE) {
      // Don't reveal draft/archived content exists at all to public visitors.
      throw new NotFoundException(`Article "${slug}" not found`);
    }
    const content = await this.documentService.getDocumentContent(
      tenantId,
      doc.id,
    );
    return { ...doc.toJSON(), content };
  }

  @ApiOperation({ summary: 'Search published articles (public)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('search')
  async search(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: PublicSearchDto,
  ) {
    this.requireTenant(tenantId);
    const searchDto: SearchQueryDto = {
      query: dto.query,
      categoryId: dto.categoryId,
      status: DocumentStatusEnum.ACTIVE,
    };
    return this.searchService.search(tenantId, searchDto);
  }
}
