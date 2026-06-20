import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ITicketCategoryRepository } from '../repositories/ticket-repository.interface';
import { TicketCategoryDefinition } from '../domain/ticket-category.entity';
import { TicketCategory } from '../domain/value-objects';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TicketCategoryService {
  constructor(
    @Inject('ITicketCategoryRepository')
    private readonly categoryRepo: ITicketCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateCategoryDto,
    userId?: string,
  ): Promise<TicketCategoryDefinition> {
    const existing = await this.categoryRepo.findByName(tenantId, dto.name);
    if (existing) {
      throw new ConflictException(
        `Category with name ${dto.name} already exists`,
      );
    }

    const category = new TicketCategoryDefinition(randomUUID(), {
      tenantId,
      name: TicketCategory.create(dto.name),
      description: dto.description,
      color: dto.color,
      isActive: dto.isActive ?? true,
    });

    await this.categoryRepo.save(category, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CATEGORY_CREATE',
      details: `Created ticket category ${dto.name}`,
    });
    return category;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCategoryDto,
    userId?: string,
  ): Promise<TicketCategoryDefinition> {
    const category = await this.getOrThrow(tenantId, id);
    category.update({
      name: dto.name ? TicketCategory.create(dto.name) : undefined,
      description: dto.description,
      color: dto.color,
      isActive: dto.isActive,
    });
    await this.categoryRepo.save(category, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CATEGORY_UPDATE',
      details: `Updated ticket category ${id}`,
    });
    return category;
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    await this.getOrThrow(tenantId, id);
    const deleted = await this.categoryRepo.delete(id, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CATEGORY_DELETE',
      details: `Deleted ticket category ${id}`,
    });
    return deleted;
  }

  async findAll(
    tenantId: string,
    activeOnly = false,
  ): Promise<TicketCategoryDefinition[]> {
    return activeOnly
      ? this.categoryRepo.findActive(tenantId)
      : this.categoryRepo.findAll(tenantId);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<TicketCategoryDefinition> {
    return this.getOrThrow(tenantId, id);
  }

  private async getOrThrow(
    tenantId: string,
    id: string,
  ): Promise<TicketCategoryDefinition> {
    const category = await this.categoryRepo.findById(id, tenantId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }
}
