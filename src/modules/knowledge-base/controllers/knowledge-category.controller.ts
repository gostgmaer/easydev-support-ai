import { Controller, Get, Post, Put, Delete, Body, Headers, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KnowledgeCategoryService } from '../services/knowledge-category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/knowledge.dto';

@Controller('v1/knowledge-categories')
@UseGuards(TenantGuard, RbacGuard)
export class KnowledgeCategoryController {
  constructor(
    private readonly categoryService: KnowledgeCategoryService,
  ) {}

  @Post()
  @Roles('tenant_admin')
  public async createCategory(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const category = await this.categoryService.createCategory(tenantId, dto);
    return category.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'agent')
  public async getCategory(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const category = await this.categoryService.getCategory(tenantId, id);
    return category.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'agent')
  public async findCategories(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const categories = await this.categoryService.findCategories(tenantId);
    return categories.map((c) => c.toJSON());
  }

  @Put(':id')
  @Roles('tenant_admin')
  public async updateCategory(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.categoryService.updateCategory(tenantId, id, dto);
    return category.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteCategory(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.categoryService.deleteCategory(tenantId, id);
  }
}
