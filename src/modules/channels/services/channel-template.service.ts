import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IChannelRepository } from '../repositories/channel-repository.interface';
import { ChannelTemplate } from '../domain/channel-template.entity';
import { ChannelTemplateDto } from '../dtos';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ChannelTemplateService {
  constructor(
    @Inject('IChannelRepository')
    private readonly channelRepo: IChannelRepository,
    private readonly auditService: AuditService,
  ) {}

  async createTemplate(
    tenantId: string,
    channelId: string,
    dto: ChannelTemplateDto,
    userId?: string,
  ): Promise<ChannelTemplate> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    const existing = await this.channelRepo.findTemplateByName(
      channelId,
      dto.templateName,
      tenantId,
    );
    if (existing) {
      throw new ConflictException(
        `Template ${dto.templateName} already exists for channel ${channelId}`,
      );
    }

    const template = new ChannelTemplate(randomUUID(), {
      tenantId,
      channelId,
      templateName: dto.templateName,
      templateType: dto.templateType,
      templateContent: dto.templateContent,
      variables: dto.variables,
      isActive: true,
    });

    await this.channelRepo.saveTemplate(template, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_TEMPLATE_CREATE',
      details: `Created template ${dto.templateName} for channel ${channelId}`,
    });

    return template;
  }

  async findTemplates(
    tenantId: string,
    channelId: string,
  ): Promise<ChannelTemplate[]> {
    return this.channelRepo.findTemplatesByChannelId(channelId, tenantId);
  }

  async findTemplateByName(
    tenantId: string,
    channelId: string,
    name: string,
  ): Promise<ChannelTemplate> {
    const template = await this.channelRepo.findTemplateByName(
      channelId,
      name,
      tenantId,
    );
    if (!template) {
      throw new NotFoundException(
        `Template ${name} for channel ${channelId} not found`,
      );
    }
    return template;
  }

  async deleteTemplate(
    tenantId: string,
    channelId: string,
    name: string,
    userId?: string,
  ): Promise<void> {
    const template = await this.channelRepo.findTemplateByName(
      channelId,
      name,
      tenantId,
    );
    if (!template) {
      throw new NotFoundException(
        `Template ${name} for channel ${channelId} not found`,
      );
    }

    await this.channelRepo.deleteTemplate(channelId, name, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_TEMPLATE_DELETE',
      details: `Deleted template ${name} from channel ${channelId}`,
    });
  }
}
