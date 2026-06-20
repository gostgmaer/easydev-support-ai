import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/knowledge.dto';

@Injectable()
export class KnowledgeCategoryService {
  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
  ) {}

  public async createCategory(
    tenantId: string,
    dto: CreateCategoryDto,
  ): Promise<KnowledgeCategory> {
    const categoryId = crypto.randomUUID();
    const category = new KnowledgeCategory(categoryId, {
      tenantId,
      name: dto.name,
      description: dto.description,
      parentCategoryId: dto.parentCategoryId,
      color: dto.color,
      sortOrder: dto.sortOrder,
    });

    return this.repository.saveCategory(category, tenantId);
  }

  public async getCategory(
    tenantId: string,
    id: string,
  ): Promise<KnowledgeCategory> {
    const category = await this.repository.getCategoryById(id, tenantId);
    if (!category) {
      throw new NotFoundException(`Knowledge Category ${id} not found`);
    }
    return category;
  }

  public async findCategories(tenantId: string): Promise<KnowledgeCategory[]> {
    return this.repository.findCategories(tenantId);
  }

  public async updateCategory(
    tenantId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<KnowledgeCategory> {
    const category = await this.getCategory(tenantId, id);
    category.update(dto);
    return this.repository.saveCategory(category, tenantId);
  }

  public async deleteCategory(tenantId: string, id: string): Promise<boolean> {
    const deleted = await this.repository.deleteCategory(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Knowledge Category ${id} not found`);
    }
    return deleted;
  }
}
import * as crypto from 'crypto';
