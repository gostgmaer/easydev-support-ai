import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { KnowledgeTag } from '../domain/knowledge-tag.entity';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
import { KnowledgeSearchLog } from '../domain/knowledge-search-log.entity';
import {
  SourceTypeEnum,
  SyncStatusEnum,
  DocumentStatusEnum,
  DocumentStatus,
  DocumentLanguage,
  DocumentTypeEnum,
  IngestionStatusEnum,
  EmbeddingStatusEnum,
} from '../domain/value-objects';

export class KnowledgeMapper {
  public static sourceToDomain(raw: any): KnowledgeSource {
    return new KnowledgeSource(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      description: raw.description || undefined,
      sourceType: raw.sourceType as SourceTypeEnum,
      status: raw.status,
      syncStatus: raw.syncStatus as SyncStatusEnum,
      uri: raw.uri || undefined,
      connectorId: raw.connectorId || undefined,
      config: raw.config || undefined,
      documentCount: raw.documentCount,
      lastSyncedAt: raw.lastSyncedAt || undefined,
      lastError: raw.lastError || undefined,
      metadata: raw.metadata || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static documentToDomain(raw: any): KnowledgeDocument {
    return new KnowledgeDocument(raw.id, {
      tenantId: raw.tenantId,
      sourceId: raw.sourceId,
      categoryId: raw.categoryId || undefined,
      title: raw.title,
      slug: raw.slug,
      documentType: raw.documentType as DocumentTypeEnum,
      status: DocumentStatus.create(raw.status as DocumentStatusEnum),
      language: DocumentLanguage.create(raw.language),
      version: raw.version, // mapped to doc_version
      syncStatus: raw.syncStatus as SyncStatusEnum,
      ingestionStatus: raw.ingestionStatus as IngestionStatusEnum,
      embeddingStatus: raw.embeddingStatus as EmbeddingStatusEnum,
      externalRef: raw.externalRef || undefined,
      sourceUri: raw.sourceUri || undefined,
      contentHash: raw.contentHash || undefined,
      chunkCount: raw.chunkCount,
      fileUrl: raw.fileUrl || undefined,
      storageProvider: raw.storageProvider || undefined,
      fileSize: raw.fileSize || undefined,
      mimeType: raw.mimeType || undefined,
      checksum: raw.checksum || undefined,
      tags: raw.tags || undefined,
      publishedAt: raw.publishedAt || undefined,
      metadata: raw.metadata || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      aggregateVersion: raw.aggregateVersion ?? raw.version ?? 1, // Fallback
    });
  }

  public static chunkToDomain(raw: any): KnowledgeChunk {
    return new KnowledgeChunk(raw.id, {
      tenantId: raw.tenantId,
      documentId: raw.documentId,
      chunkIndex: raw.chunkIndex,
      chunkHash: raw.chunkHash,
      content: raw.content,
      tokenCount: raw.tokenCount,
      externalRef: raw.externalRef || undefined,
      metadata: raw.metadata || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static categoryToDomain(raw: any): KnowledgeCategory {
    return new KnowledgeCategory(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      description: raw.description || undefined,
      parentCategoryId: raw.parentCategoryId || undefined,
      color: raw.color || undefined,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static tagToDomain(raw: any): KnowledgeTag {
    return new KnowledgeTag(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      description: raw.description || undefined,
      color: raw.color || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static versionToDomain(raw: any): KnowledgeVersion {
    return new KnowledgeVersion(raw.id, {
      tenantId: raw.tenantId,
      documentId: raw.documentId,
      versionNumber: raw.versionNumber,
      changeSummary: raw.changeSummary || undefined,
      contentHash: raw.contentHash || undefined,
      snapshot: raw.snapshot || undefined,
      publishedBy: raw.publishedBy || undefined,
      publishedAt: raw.publishedAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static permissionToDomain(raw: any): KnowledgePermission {
    return new KnowledgePermission(raw.id, {
      tenantId: raw.tenantId,
      documentId: raw.documentId,
      teamId: raw.teamId || undefined,
      role: raw.role || undefined,
      accessLevel: raw.accessLevel,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static syncJobToDomain(raw: any): KnowledgeSyncJob {
    return new KnowledgeSyncJob(raw.id, {
      tenantId: raw.tenantId,
      sourceId: raw.sourceId,
      documentId: raw.documentId || undefined,
      jobType: raw.jobType,
      status: raw.status,
      totalItems: raw.totalItems,
      processedItems: raw.processedItems,
      failedItems: raw.failedItems,
      error: raw.error || undefined,
      stats: raw.stats || undefined,
      startedAt: raw.startedAt || undefined,
      completedAt: raw.completedAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  public static searchLogToDomain(raw: any): KnowledgeSearchLog {
    return new KnowledgeSearchLog(raw.id, {
      tenantId: raw.tenantId,
      userId: raw.userId || undefined,
      query: raw.query,
      filters: raw.filters || undefined,
      resultsCount: raw.resultsCount,
      latencyMs: raw.latencyMs,
      source: raw.source,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }
}
