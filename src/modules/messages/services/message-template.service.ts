import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMessageTemplateRepository } from '../repositories/message-repository.interface';
import { MessageTemplate } from '../domain/message-template.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
} from '../dtos';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class MessageTemplateService {
  constructor(
    @Inject('IMessageTemplateRepository')
    private readonly templateRepo: IMessageTemplateRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateTemplateDto,
    userId?: string,
  ): Promise<MessageTemplate> {
    const existing = await this.templateRepo.findByName(tenantId, dto.name);
    if (existing) {
      throw new ConflictException(
        `Template with name ${dto.name} already exists`,
      );
    }

    const template = new MessageTemplate(randomUUID(), {
      tenantId,
      name: dto.name,
      channelType: dto.channelType,
      category: dto.category,
      content: dto.content,
      contentHtml: dto.contentHtml,
      variables: dto.variables || {},
      language: dto.language || 'en',
      isActive: dto.isActive ?? true,
    });

    await this.templateRepo.save(template, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_TEMPLATE_CREATE',
      details: `Created message template ${template.name}`,
    });
    return template;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTemplateDto,
    userId?: string,
  ): Promise<MessageTemplate> {
    const template = await this.getOrThrow(tenantId, id);
    template.update({
      channelType: dto.channelType,
      category: dto.category,
      content: dto.content,
      contentHtml: dto.contentHtml,
      variables: dto.variables,
      language: dto.language,
      isActive: dto.isActive,
    });
    await this.templateRepo.save(template, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_TEMPLATE_UPDATE',
      details: `Updated message template ${id}`,
    });
    return template;
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    await this.getOrThrow(tenantId, id);
    const deleted = await this.templateRepo.delete(id, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'MESSAGE_TEMPLATE_DELETE',
      details: `Deleted message template ${id}`,
    });
    return deleted;
  }

  async findById(tenantId: string, id: string): Promise<MessageTemplate> {
    return this.getOrThrow(tenantId, id);
  }

  async findPaginated(tenantId: string, query: TemplateQueryDto) {
    const result = await this.templateRepo.findPaginated(
      tenantId,
      query.page || 1,
      query.limit || 25,
      query.category,
    );
    return result;
  }

  /**
   * Resolves a template by name and renders its placeholders. Used by the
   * outbound delivery pipeline.
   */
  async render(
    tenantId: string,
    name: string,
    variables: Record<string, any>,
  ): Promise<string> {
    const template = await this.templateRepo.findByName(tenantId, name);
    if (!template) {
      throw new NotFoundException(`Template ${name} not found`);
    }
    if (!template.isActive) {
      throw new NotFoundException(`Template ${name} is inactive`);
    }
    return template.render(variables);
  }

  private async getOrThrow(
    tenantId: string,
    id: string,
  ): Promise<MessageTemplate> {
    const template = await this.templateRepo.findById(id, tenantId);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }
}
