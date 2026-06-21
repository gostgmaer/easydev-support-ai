import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  PublishDocumentDto,
} from '../dtos/knowledge.dto';
import {
  DocumentStatus,
  DocumentStatusEnum,
  DocumentLanguage,
  SyncStatusEnum,
  IngestionStatusEnum,
  EmbeddingStatusEnum,
} from '../domain/value-objects';
import { KnowledgeEventPublisher } from './knowledge-event.publisher';

@Injectable()
export class KnowledgeDocumentService {
  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
    private readonly eventPublisher: KnowledgeEventPublisher,
  ) {}

  public async createDocument(
    tenantId: string,
    dto: CreateDocumentDto,
  ): Promise<KnowledgeDocument> {
    const documentId = crypto.randomUUID();
    const doc = KnowledgeDocument.create(documentId, {
      tenantId,
      sourceId: dto.sourceId,
      categoryId: dto.categoryId,
      title: dto.title,
      slug: dto.slug,
      documentType: dto.documentType,
      status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
      language: DocumentLanguage.create(dto.language),
      version: 1,
      syncStatus: SyncStatusEnum.PENDING,
      ingestionStatus: IngestionStatusEnum.PENDING,
      embeddingStatus: EmbeddingStatusEnum.PENDING,
      fileUrl: dto.fileUrl,
      storageProvider: dto.storageProvider,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      checksum: dto.checksum,
      tags: dto.tags,
      metadata: dto.metadata,
    });

    const saved = await this.repository.save(doc, tenantId);
    await this.eventPublisher.publishAll(doc.domainEvents);
    doc.clearEvents();
    return saved;
  }

  public async getDocument(
    tenantId: string,
    id: string,
  ): Promise<KnowledgeDocument> {
    const doc = await this.repository.findById(id, tenantId);
    if (!doc) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }
    return doc;
  }

  public async getDocumentBySlug(
    tenantId: string,
    slug: string,
  ): Promise<KnowledgeDocument> {
    const doc = await this.repository.findBySlug(tenantId, slug);
    if (!doc) {
      throw new NotFoundException(`Knowledge Document "${slug}" not found`);
    }
    return doc;
  }

  public async findDocuments(tenantId: string, options: any) {
    return this.repository.findDocuments(tenantId, options);
  }

  public async getDocumentContent(
    tenantId: string,
    documentId: string,
  ): Promise<string> {
    const chunks = await this.repository.getChunksByDocumentId(
      documentId,
      tenantId,
    );
    return chunks.map((c) => c.content).join('\n\n');
  }

  public async updateDocument(
    tenantId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<KnowledgeDocument> {
    const doc = await this.getDocument(tenantId, id);
    doc.update(dto);
    const saved = await this.repository.save(doc, tenantId);
    await this.eventPublisher.publishAll(doc.domainEvents);
    doc.clearEvents();
    return saved;
  }

  public async publishDocument(
    tenantId: string,
    id: string,
    dto: PublishDocumentDto,
    publishedBy?: string,
  ): Promise<KnowledgeDocument> {
    const doc = await this.getDocument(tenantId, id);
    doc.publish(publishedBy);
    const saved = await this.repository.save(doc, tenantId);

    // Save snapshot in version history
    const version = new KnowledgeVersion(crypto.randomUUID(), {
      tenantId,
      documentId: doc.id,
      versionNumber: doc.version,
      changeSummary: dto.changeSummary,
      contentHash: doc.contentHash,
      snapshot: doc.toJSON(),
      publishedBy,
      publishedAt: new Date(),
    });
    await this.repository.saveVersion(version, tenantId);

    await this.eventPublisher.publishAll(doc.domainEvents);
    doc.clearEvents();
    return saved;
  }

  public async archiveDocument(
    tenantId: string,
    id: string,
    archivedBy?: string,
  ): Promise<KnowledgeDocument> {
    const doc = await this.getDocument(tenantId, id);
    doc.archive(archivedBy);
    const saved = await this.repository.save(doc, tenantId);
    await this.eventPublisher.publishAll(doc.domainEvents);
    doc.clearEvents();
    return saved;
  }

  public async deleteDocument(tenantId: string, id: string): Promise<boolean> {
    const deleted = await this.repository.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Knowledge Document ${id} not found`);
    }
    return deleted;
  }
}
import * as crypto from 'crypto';
