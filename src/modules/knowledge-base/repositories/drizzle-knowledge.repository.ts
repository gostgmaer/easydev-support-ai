import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, or, ilike, desc, asc, isNull } from 'drizzle-orm';
import {
  IKnowledgeRepository,
  DocumentQueryOptions,
  PaginatedResult,
} from './knowledge-repository.interface';
import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { KnowledgeTag } from '../domain/knowledge-tag.entity';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
import { KnowledgeSearchLog } from '../domain/knowledge-search-log.entity';
import { KnowledgeMapper } from './knowledge.mapper';

@Injectable()
export class DrizzleKnowledgeRepository implements IKnowledgeRepository {
  // ------------------ Sources ------------------
  async saveSource(
    source: KnowledgeSource,
    tenantId: string,
  ): Promise<KnowledgeSource> {
    const raw = {
      id: source.id,
      tenantId: source.tenantId,
      name: source.name,
      description: source.description || null,
      sourceType: source.sourceType,
      status: source.status,
      syncStatus: source.syncStatus,
      uri: source.uri || null,
      connectorId: source.connectorId || null,
      config: source.config || null,
      documentCount: source.documentCount,
      lastSyncedAt: source.lastSyncedAt || null,
      lastError: source.lastError || null,
      metadata: source.metadata || null,
      updatedAt: new Date(),
      version: source.version,
    };

    const [existing] = await db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.id, source.id),
          eq(schema.knowledgeSources.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.knowledgeSources)
        .set(raw)
        .where(
          and(
            eq(schema.knowledgeSources.id, source.id),
            eq(schema.knowledgeSources.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.knowledgeSources)
        .values({ ...raw, createdAt: source.createdAt });
    }

    return source;
  }

  async getSourceById(
    id: string,
    tenantId: string,
  ): Promise<KnowledgeSource | null> {
    const [row] = await db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.id, id),
          eq(schema.knowledgeSources.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return KnowledgeMapper.sourceToDomain(row);
  }

  async findSources(
    tenantId: string,
  ): Promise<PaginatedResult<KnowledgeSource>> {
    const rows = await db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.tenantId, tenantId),
          isNull(schema.knowledgeSources.deletedAt),
        ),
      )
      .orderBy(desc(schema.knowledgeSources.createdAt));

    return {
      data: rows.map((r) => KnowledgeMapper.sourceToDomain(r)),
      total: rows.length,
    };
  }

  async deleteSource(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.id, id),
          eq(schema.knowledgeSources.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .update(schema.knowledgeSources)
      .set({ deletedAt: new Date(), status: 'DISABLED' })
      .where(
        and(
          eq(schema.knowledgeSources.id, id),
          eq(schema.knowledgeSources.tenantId, tenantId),
        ),
      );

    return true;
  }

  // ------------------ Documents ------------------
  async findById(
    id: string,
    tenantId: string,
  ): Promise<KnowledgeDocument | null> {
    const [row] = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(
        and(
          eq(schema.knowledgeDocuments.id, id),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
          isNull(schema.knowledgeDocuments.deletedAt),
        ),
      );
    if (!row) return null;
    return KnowledgeMapper.documentToDomain(row);
  }

  async findBySlug(
    tenantId: string,
    slug: string,
  ): Promise<KnowledgeDocument | null> {
    const [row] = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(
        and(
          eq(schema.knowledgeDocuments.slug, slug),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
          isNull(schema.knowledgeDocuments.deletedAt),
        ),
      );
    if (!row) return null;
    return KnowledgeMapper.documentToDomain(row);
  }

  async findAll(tenantId: string): Promise<KnowledgeDocument[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(
        and(
          eq(schema.knowledgeDocuments.tenantId, tenantId),
          isNull(schema.knowledgeDocuments.deletedAt),
        ),
      );
    return rows.map((r) => KnowledgeMapper.documentToDomain(r));
  }

  async save(
    document: KnowledgeDocument,
    tenantId: string,
  ): Promise<KnowledgeDocument> {
    const raw = {
      id: document.id,
      tenantId: document.tenantId,
      sourceId: document.sourceId,
      categoryId: document.categoryId || null,
      title: document.title,
      slug: document.slug,
      documentType: document.documentType,
      status: document.status.value,
      language: document.language.value,
      version: document.version, // doc_version
      syncStatus: document.syncStatus,
      ingestionStatus: document.ingestionStatus,
      embeddingStatus: document.embeddingStatus,
      externalRef: document.externalRef || null,
      sourceUri: document.sourceUri || null,
      contentHash: document.contentHash || null,
      chunkCount: document.chunkCount,
      fileUrl: document.fileUrl || null,
      storageProvider: document.storageProvider || null,
      fileSize: document.fileSize || null,
      mimeType: document.mimeType || null,
      checksum: document.checksum || null,
      tags: document.tags,
      publishedAt: document.publishedAt || null,
      metadata: document.metadata || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(
        and(
          eq(schema.knowledgeDocuments.id, document.id),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.knowledgeDocuments)
        .set(raw)
        .where(
          and(
            eq(schema.knowledgeDocuments.id, document.id),
            eq(schema.knowledgeDocuments.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.knowledgeDocuments)
        .values({ ...raw, createdAt: document.createdAt });
    }

    return document;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(
        and(
          eq(schema.knowledgeDocuments.id, id),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .update(schema.knowledgeDocuments)
      .set({ deletedAt: new Date(), status: 'ARCHIVED' })
      .where(
        and(
          eq(schema.knowledgeDocuments.id, id),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
        ),
      );

    return true;
  }

  async findDocuments(
    tenantId: string,
    options: DocumentQueryOptions,
  ): Promise<PaginatedResult<KnowledgeDocument>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.knowledgeDocuments.tenantId, tenantId),
      isNull(schema.knowledgeDocuments.deletedAt),
    ];

    if (options.sourceId) {
      conditions.push(eq(schema.knowledgeDocuments.sourceId, options.sourceId));
    }
    if (options.categoryId) {
      conditions.push(
        eq(schema.knowledgeDocuments.categoryId, options.categoryId),
      );
    }
    if (options.status) {
      conditions.push(eq(schema.knowledgeDocuments.status, options.status));
    }
    if (options.language) {
      conditions.push(eq(schema.knowledgeDocuments.language, options.language));
    }
    if (options.search) {
      conditions.push(
        or(
          ilike(schema.knowledgeDocuments.title, `%${options.search}%`),
          ilike(schema.knowledgeDocuments.slug, `%${options.search}%`),
        ) as any,
      );
    }

    const query = db
      .select()
      .from(schema.knowledgeDocuments)
      .where(and(...conditions));

    const totalRows = await query;
    const paginatedRows = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.knowledgeDocuments.createdAt));

    return {
      data: paginatedRows.map((r) => KnowledgeMapper.documentToDomain(r)),
      total: totalRows.length,
    };
  }

  async incrementDocVersion(id: string, tenantId: string): Promise<number> {
    const [row] = await db
      .select()
      .from(schema.knowledgeDocuments)
      .where(
        and(
          eq(schema.knowledgeDocuments.id, id),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
        ),
      );

    if (!row) {
      throw new Error(`Document ${id} not found`);
    }

    const nextVer = row.version + 1;
    await db
      .update(schema.knowledgeDocuments)
      .set({ version: nextVer, updatedAt: new Date() })
      .where(
        and(
          eq(schema.knowledgeDocuments.id, id),
          eq(schema.knowledgeDocuments.tenantId, tenantId),
        ),
      );

    return nextVer;
  }

  // ------------------ Chunks ------------------
  async saveChunks(chunks: KnowledgeChunk[], tenantId: string): Promise<void> {
    if (chunks.length === 0) return;

    await db.transaction(async (tx) => {
      // 1. Delete old chunks for this document
      const docId = chunks[0].documentId;
      await tx
        .delete(schema.knowledgeChunks)
        .where(
          and(
            eq(schema.knowledgeChunks.documentId, docId),
            eq(schema.knowledgeChunks.tenantId, tenantId),
          ),
        );

      // 2. Insert new chunks in bulk
      const values = chunks.map((c) => ({
        id: c.id,
        tenantId,
        documentId: c.documentId,
        chunkIndex: c.chunkIndex,
        chunkHash: c.chunkHash,
        content: c.content,
        tokenCount: c.tokenCount,
        externalRef: c.externalRef || null,
        metadata: c.metadata || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      await tx.insert(schema.knowledgeChunks).values(values);
    });
  }

  async getChunksByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<KnowledgeChunk[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeChunks)
      .where(
        and(
          eq(schema.knowledgeChunks.documentId, documentId),
          eq(schema.knowledgeChunks.tenantId, tenantId),
        ),
      )
      .orderBy(asc(schema.knowledgeChunks.chunkIndex));

    return rows.map((r) => KnowledgeMapper.chunkToDomain(r));
  }

  async deleteChunksByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<void> {
    await db
      .delete(schema.knowledgeChunks)
      .where(
        and(
          eq(schema.knowledgeChunks.documentId, documentId),
          eq(schema.knowledgeChunks.tenantId, tenantId),
        ),
      );
  }

  // ------------------ Categories ------------------
  async saveCategory(
    category: KnowledgeCategory,
    tenantId: string,
  ): Promise<KnowledgeCategory> {
    const raw = {
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      description: category.description || null,
      parentCategoryId: category.parentCategoryId || null,
      color: category.color || null,
      sortOrder: category.sortOrder,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.knowledgeCategories)
      .where(
        and(
          eq(schema.knowledgeCategories.id, category.id),
          eq(schema.knowledgeCategories.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.knowledgeCategories)
        .set(raw)
        .where(
          and(
            eq(schema.knowledgeCategories.id, category.id),
            eq(schema.knowledgeCategories.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.knowledgeCategories)
        .values({ ...raw, createdAt: category.createdAt });
    }

    return category;
  }

  async getCategoryById(
    id: string,
    tenantId: string,
  ): Promise<KnowledgeCategory | null> {
    const [row] = await db
      .select()
      .from(schema.knowledgeCategories)
      .where(
        and(
          eq(schema.knowledgeCategories.id, id),
          eq(schema.knowledgeCategories.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return KnowledgeMapper.categoryToDomain(row);
  }

  async findCategories(tenantId: string): Promise<KnowledgeCategory[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeCategories)
      .where(eq(schema.knowledgeCategories.tenantId, tenantId))
      .orderBy(asc(schema.knowledgeCategories.sortOrder));
    return rows.map((r) => KnowledgeMapper.categoryToDomain(r));
  }

  async deleteCategory(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.knowledgeCategories)
      .where(
        and(
          eq(schema.knowledgeCategories.id, id),
          eq(schema.knowledgeCategories.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    // Set null on child categories
    await db
      .update(schema.knowledgeCategories)
      .set({ parentCategoryId: null })
      .where(
        and(
          eq(schema.knowledgeCategories.parentCategoryId, id),
          eq(schema.knowledgeCategories.tenantId, tenantId),
        ),
      );

    await db
      .delete(schema.knowledgeCategories)
      .where(
        and(
          eq(schema.knowledgeCategories.id, id),
          eq(schema.knowledgeCategories.tenantId, tenantId),
        ),
      );

    return true;
  }

  // ------------------ Tags ------------------
  async saveTag(tag: KnowledgeTag, tenantId: string): Promise<KnowledgeTag> {
    const raw = {
      id: tag.id,
      tenantId: tag.tenantId,
      name: tag.name,
      description: tag.description || null,
      color: tag.color || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.knowledgeTags)
      .where(
        and(
          eq(schema.knowledgeTags.id, tag.id),
          eq(schema.knowledgeTags.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.knowledgeTags)
        .set(raw)
        .where(
          and(
            eq(schema.knowledgeTags.id, tag.id),
            eq(schema.knowledgeTags.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.knowledgeTags)
        .values({ ...raw, createdAt: tag.createdAt });
    }

    return tag;
  }

  async getTagByName(
    name: string,
    tenantId: string,
  ): Promise<KnowledgeTag | null> {
    const [row] = await db
      .select()
      .from(schema.knowledgeTags)
      .where(
        and(
          eq(schema.knowledgeTags.name, name),
          eq(schema.knowledgeTags.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return KnowledgeMapper.tagToDomain(row);
  }

  async findTags(tenantId: string): Promise<KnowledgeTag[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeTags)
      .where(eq(schema.knowledgeTags.tenantId, tenantId))
      .orderBy(asc(schema.knowledgeTags.name));
    return rows.map((r) => KnowledgeMapper.tagToDomain(r));
  }

  // ------------------ Versions ------------------
  async saveVersion(version: KnowledgeVersion): Promise<KnowledgeVersion> {
    const raw = {
      id: version.id,
      tenantId: version.tenantId,
      documentId: version.documentId,
      versionNumber: version.versionNumber,
      changeSummary: version.changeSummary || null,
      contentHash: version.contentHash || null,
      snapshot: version.snapshot || null,
      publishedBy: version.publishedBy || null,
      publishedAt: version.publishedAt,
      updatedAt: new Date(),
    };

    await db
      .insert(schema.knowledgeVersions)
      .values({ ...raw, createdAt: version.createdAt });
    return version;
  }

  async getVersionsByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<KnowledgeVersion[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeVersions)
      .where(
        and(
          eq(schema.knowledgeVersions.documentId, documentId),
          eq(schema.knowledgeVersions.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.knowledgeVersions.versionNumber));
    return rows.map((r) => KnowledgeMapper.versionToDomain(r));
  }

  // ------------------ Permissions ------------------
  async savePermission(
    permission: KnowledgePermission,
    tenantId: string,
  ): Promise<KnowledgePermission> {
    const raw = {
      id: permission.id,
      tenantId: permission.tenantId,
      documentId: permission.documentId,
      teamId: permission.teamId || null,
      role: permission.role || null,
      accessLevel: permission.accessLevel,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.knowledgePermissions)
      .where(
        and(
          eq(schema.knowledgePermissions.id, permission.id),
          eq(schema.knowledgePermissions.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.knowledgePermissions)
        .set(raw)
        .where(
          and(
            eq(schema.knowledgePermissions.id, permission.id),
            eq(schema.knowledgePermissions.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.knowledgePermissions)
        .values({ ...raw, createdAt: permission.createdAt });
    }

    return permission;
  }

  async getPermissionsByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<KnowledgePermission[]> {
    const rows = await db
      .select()
      .from(schema.knowledgePermissions)
      .where(
        and(
          eq(schema.knowledgePermissions.documentId, documentId),
          eq(schema.knowledgePermissions.tenantId, tenantId),
        ),
      );
    return rows.map((r) => KnowledgeMapper.permissionToDomain(r));
  }

  async deletePermission(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.knowledgePermissions)
      .where(
        and(
          eq(schema.knowledgePermissions.id, id),
          eq(schema.knowledgePermissions.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .delete(schema.knowledgePermissions)
      .where(
        and(
          eq(schema.knowledgePermissions.id, id),
          eq(schema.knowledgePermissions.tenantId, tenantId),
        ),
      );

    return true;
  }

  async checkPermission(
    documentId: string,
    tenantId: string,
    teamId?: string,
    role?: string,
    requiredLevel: string = 'READ',
  ): Promise<boolean> {
    const rows = await db
      .select()
      .from(schema.knowledgePermissions)
      .where(
        and(
          eq(schema.knowledgePermissions.documentId, documentId),
          eq(schema.knowledgePermissions.tenantId, tenantId),
        ),
      );

    if (rows.length === 0) {
      return true; // Inherits default public workspace access if no restrictions configured
    }

    const accessLevels = { READ: 1, WRITE: 2, MANAGE: 3 } as any;
    const reqWeight = accessLevels[requiredLevel] || 1;

    for (const r of rows) {
      const matchTeam = teamId && r.teamId === teamId;
      const matchRole = role && r.role === role;
      const matchPublic = !r.teamId && !r.role;

      if (matchTeam || matchRole || matchPublic) {
        const weight = accessLevels[r.accessLevel] || 1;
        if (weight >= reqWeight) {
          return true;
        }
      }
    }

    return false;
  }

  // ------------------ Sync Jobs ------------------
  async saveSyncJob(
    job: KnowledgeSyncJob,
    tenantId: string,
  ): Promise<KnowledgeSyncJob> {
    const raw = {
      id: job.id,
      tenantId: job.tenantId,
      sourceId: job.sourceId,
      documentId: job.documentId || null,
      jobType: job.jobType,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      failedItems: job.failedItems,
      error: job.error || null,
      stats: job.stats || null,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.knowledgeSyncJobs)
      .where(
        and(
          eq(schema.knowledgeSyncJobs.id, job.id),
          eq(schema.knowledgeSyncJobs.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.knowledgeSyncJobs)
        .set(raw)
        .where(
          and(
            eq(schema.knowledgeSyncJobs.id, job.id),
            eq(schema.knowledgeSyncJobs.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.knowledgeSyncJobs)
        .values({ ...raw, createdAt: job.createdAt });
    }

    return job;
  }

  async getSyncJobById(
    id: string,
    tenantId: string,
  ): Promise<KnowledgeSyncJob | null> {
    const [row] = await db
      .select()
      .from(schema.knowledgeSyncJobs)
      .where(
        and(
          eq(schema.knowledgeSyncJobs.id, id),
          eq(schema.knowledgeSyncJobs.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return KnowledgeMapper.syncJobToDomain(row);
  }

  async findSyncJobs(
    tenantId: string,
    sourceId: string,
  ): Promise<KnowledgeSyncJob[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeSyncJobs)
      .where(
        and(
          eq(schema.knowledgeSyncJobs.sourceId, sourceId),
          eq(schema.knowledgeSyncJobs.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.knowledgeSyncJobs.createdAt));
    return rows.map((r) => KnowledgeMapper.syncJobToDomain(r));
  }

  // ------------------ Search Logs ------------------
  async addSearchLog(log: KnowledgeSearchLog): Promise<void> {
    const raw = {
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId || null,
      query: log.query,
      filters: log.filters || null,
      resultsCount: log.resultsCount,
      latencyMs: log.latencyMs,
      source: log.source,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      version: log.version,
    };
    await db.insert(schema.knowledgeSearchLogs).values(raw);
  }

  async getSearchLogs(
    tenantId: string,
    options?: any,
  ): Promise<KnowledgeSearchLog[]> {
    const rows = await db
      .select()
      .from(schema.knowledgeSearchLogs)
      .where(eq(schema.knowledgeSearchLogs.tenantId, tenantId))
      .orderBy(desc(schema.knowledgeSearchLogs.createdAt))
      .limit(options?.limit || 100);
    return rows.map((r) => KnowledgeMapper.searchLogToDomain(r));
  }
}
