import { ITenantRepository } from '@easydev/shared-kernel';
import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { KnowledgeTag } from '../domain/knowledge-tag.entity';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
import { KnowledgeSearchLog } from '../domain/knowledge-search-log.entity';

export interface DocumentQueryOptions {
  page?: number;
  limit?: number;
  sourceId?: string;
  categoryId?: string;
  status?: string;
  language?: string;
  search?: string;
  tags?: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IKnowledgeRepository extends ITenantRepository<
  KnowledgeDocument,
  string
> {
  // Sources
  saveSource(
    source: KnowledgeSource,
    tenantId: string,
  ): Promise<KnowledgeSource>;
  getSourceById(id: string, tenantId: string): Promise<KnowledgeSource | null>;
  findSources(
    tenantId: string,
    options?: any,
  ): Promise<PaginatedResult<KnowledgeSource>>;
  deleteSource(id: string, tenantId: string): Promise<boolean>;

  // Documents
  findBySlug(tenantId: string, slug: string): Promise<KnowledgeDocument | null>;
  findDocuments(
    tenantId: string,
    options: DocumentQueryOptions,
  ): Promise<PaginatedResult<KnowledgeDocument>>;
  incrementDocVersion(id: string, tenantId: string): Promise<number>;

  // Chunks
  saveChunks(chunks: KnowledgeChunk[], tenantId: string): Promise<void>;
  getChunksByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<KnowledgeChunk[]>;
  deleteChunksByDocumentId(documentId: string, tenantId: string): Promise<void>;

  // Categories
  saveCategory(
    category: KnowledgeCategory,
    tenantId: string,
  ): Promise<KnowledgeCategory>;
  getCategoryById(
    id: string,
    tenantId: string,
  ): Promise<KnowledgeCategory | null>;
  findCategories(tenantId: string): Promise<KnowledgeCategory[]>;
  deleteCategory(id: string, tenantId: string): Promise<boolean>;

  // Tags
  saveTag(tag: KnowledgeTag, tenantId: string): Promise<KnowledgeTag>;
  getTagByName(name: string, tenantId: string): Promise<KnowledgeTag | null>;
  findTags(tenantId: string): Promise<KnowledgeTag[]>;

  // Versions
  saveVersion(
    version: KnowledgeVersion,
    tenantId: string,
  ): Promise<KnowledgeVersion>;
  getVersionsByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<KnowledgeVersion[]>;

  // Permissions
  savePermission(
    permission: KnowledgePermission,
    tenantId: string,
  ): Promise<KnowledgePermission>;
  getPermissionsByDocumentId(
    documentId: string,
    tenantId: string,
  ): Promise<KnowledgePermission[]>;
  deletePermission(id: string, tenantId: string): Promise<boolean>;
  checkPermission(
    documentId: string,
    tenantId: string,
    teamId?: string,
    role?: string,
    requiredLevel?: string,
  ): Promise<boolean>;

  // Sync Jobs
  saveSyncJob(
    job: KnowledgeSyncJob,
    tenantId: string,
  ): Promise<KnowledgeSyncJob>;
  getSyncJobById(
    id: string,
    tenantId: string,
  ): Promise<KnowledgeSyncJob | null>;
  findSyncJobs(tenantId: string, sourceId: string): Promise<KnowledgeSyncJob[]>;

  // Search Logs
  addSearchLog(log: KnowledgeSearchLog, tenantId: string): Promise<void>;
  getSearchLogs(tenantId: string, options?: any): Promise<KnowledgeSearchLog[]>;
}
