import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { CreateSourceDto, UpdateSourceDto } from '../dtos/knowledge.dto';
import { KnowledgeEventPublisher } from './knowledge-event.publisher';

@Injectable()
export class KnowledgeSourceService {
  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
    private readonly eventPublisher: KnowledgeEventPublisher,
  ) {}

  public async createSource(
    tenantId: string,
    dto: CreateSourceDto,
  ): Promise<KnowledgeSource> {
    const sourceId = crypto.randomUUID();
    const source = KnowledgeSource.create(sourceId, {
      tenantId,
      name: dto.name,
      description: dto.description,
      sourceType: dto.sourceType,
      status: 'ACTIVE',
      uri: dto.uri,
      config: dto.config,
      metadata: dto.metadata,
    });

    const saved = await this.repository.saveSource(source, tenantId);
    await this.eventPublisher.publishAll(source.domainEvents);
    source.clearEvents();
    return saved;
  }

  public async getSource(
    tenantId: string,
    id: string,
  ): Promise<KnowledgeSource> {
    const source = await this.repository.getSourceById(id, tenantId);
    if (!source) {
      throw new NotFoundException(`Knowledge Source ${id} not found`);
    }
    return source;
  }

  public async findSources(tenantId: string, options?: any) {
    return this.repository.findSources(tenantId, options);
  }

  public async updateSource(
    tenantId: string,
    id: string,
    dto: UpdateSourceDto,
  ): Promise<KnowledgeSource> {
    const source = await this.getSource(tenantId, id);
    source.update(dto);
    const saved = await this.repository.saveSource(source, tenantId);
    await this.eventPublisher.publishAll(source.domainEvents);
    source.clearEvents();
    return saved;
  }

  public async deleteSource(tenantId: string, id: string): Promise<boolean> {
    const deleted = await this.repository.deleteSource(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Knowledge Source ${id} not found`);
    }
    return deleted;
  }
}
import * as crypto from 'crypto';
