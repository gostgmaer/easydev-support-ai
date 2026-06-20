import { DrizzleKnowledgeRepository } from '../repositories/drizzle-knowledge.repository';
import { db } from '@easydev/database';
import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { KnowledgeTag } from '../domain/knowledge-tag.entity';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
import { KnowledgeSearchLog } from '../domain/knowledge-search-log.entity';
import {
  SourceTypeEnum,
  SyncStatusEnum,
  DocumentStatus,
  DocumentStatusEnum,
  DocumentLanguage,
  DocumentTypeEnum,
  IngestionStatusEnum,
  EmbeddingStatusEnum,
} from '../domain/value-objects';
import { randomUUID } from 'crypto';

let mockResults: any[] = [];

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  then: jest.fn((resolve) => {
    const res = mockResults.length > 0 ? mockResults.shift() : [];
    resolve(res);
  }),
};

jest.mock('@easydev/database', () => {
  return {
    db: {
      select: jest.fn(() => queryBuilder),
      insert: jest.fn(() => queryBuilder),
      update: jest.fn(() => queryBuilder),
      delete: jest.fn(() => queryBuilder),
      transaction: jest.fn((cb) => cb(queryBuilder)),
    },
    schema: {
      knowledgeSources: {
        id: 'sources.id',
        tenantId: 'sources.tenant_id',
        deletedAt: 'sources.deleted_at',
      },
      knowledgeDocuments: {
        id: 'docs.id',
        tenantId: 'docs.tenant_id',
        deletedAt: 'docs.deleted_at',
      },
      knowledgeChunks: { id: 'chunks.id', tenantId: 'chunks.tenant_id' },
      knowledgeCategories: {
        id: 'categories.id',
        tenantId: 'categories.tenant_id',
        deletedAt: 'categories.deleted_at',
      },
      knowledgeTags: { name: 'tags.name', tenantId: 'tags.tenant_id' },
      knowledgeVersions: { id: 'versions.id', tenantId: 'versions.tenant_id' },
      knowledgePermissions: {
        id: 'permissions.id',
        tenantId: 'permissions.tenant_id',
      },
      knowledgeSyncJobs: {
        id: 'sync_jobs.id',
        tenantId: 'sync_jobs.tenant_id',
      },
      knowledgeSearchLogs: {
        id: 'search_logs.id',
        tenantId: 'search_logs.tenant_id',
      },
    },
  };
});

describe('Knowledge Drizzle Repository', () => {
  let repo: DrizzleKnowledgeRepository;
  const tenantId = randomUUID();
  const sourceId = randomUUID();
  const docId = randomUUID();
  const catId = randomUUID();

  beforeEach(() => {
    repo = new DrizzleKnowledgeRepository();
    mockResults = [];
    jest.clearAllMocks();
  });

  describe('Sources Operations', () => {
    it('should save a new source (insert) and update source', async () => {
      const source = KnowledgeSource.create(sourceId, {
        tenantId,
        name: 'Manual PDF',
        sourceType: SourceTypeEnum.PDF,
      });

      // Insert path: empty existing select
      mockResults.push([]);
      const savedInsert = await repo.saveSource(source, tenantId);
      expect(savedInsert).toBe(source);
      expect(db.insert).toHaveBeenCalled();

      // Update path: non-empty existing select
      mockResults.push([{ id: sourceId }]);
      const savedUpdate = await repo.saveSource(source, tenantId);
      expect(savedUpdate).toBe(source);
      expect(db.update).toHaveBeenCalled();
    });

    it('should find source by id or return null', async () => {
      mockResults.push([
        {
          id: sourceId,
          tenantId,
          name: 'PDF',
          sourceType: 'PDF',
          status: 'ACTIVE',
          syncStatus: 'PENDING',
          documentCount: 0,
        },
      ]);
      const found = await repo.getSourceById(sourceId, tenantId);
      expect(found).toBeDefined();
      expect(found?.name).toBe('PDF');

      mockResults.push([]);
      const notFound = await repo.getSourceById('missing', tenantId);
      expect(notFound).toBeNull();
    });

    it('should find all sources', async () => {
      mockResults.push([
        {
          id: sourceId,
          tenantId,
          name: 'PDF',
          sourceType: 'PDF',
          status: 'ACTIVE',
          syncStatus: 'PENDING',
          documentCount: 0,
        },
      ]);
      const res = await repo.findSources(tenantId);
      expect(res.data.length).toBe(1);
    });

    it('should delete source (soft-delete)', async () => {
      mockResults.push([{ id: sourceId }]);
      const res = await repo.deleteSource(sourceId, tenantId);
      expect(res).toBe(true);

      mockResults.push([]);
      const resFalse = await repo.deleteSource('missing', tenantId);
      expect(resFalse).toBe(false);
    });
  });

  describe('Documents Operations', () => {
    it('should find by id, find by slug, and find all active', async () => {
      const row = {
        id: docId,
        tenantId,
        sourceId,
        title: 'Title',
        slug: 'slug',
        documentType: 'PDF',
        status: 'ACTIVE',
        language: 'en',
        version: 1,
        syncStatus: 'PENDING',
        ingestionStatus: 'PENDING',
        embeddingStatus: 'PENDING',
        chunkCount: 0,
      };

      mockResults.push([row]);
      const foundId = await repo.findById(docId, tenantId);
      expect(foundId).toBeDefined();
      expect(foundId?.title).toBe('Title');

      mockResults.push([]);
      const notFoundId = await repo.findById(docId, tenantId);
      expect(notFoundId).toBeNull();

      mockResults.push([row]);
      const foundSlug = await repo.findBySlug(tenantId, 'slug');
      expect(foundSlug).toBeDefined();

      mockResults.push([]);
      const notFoundSlug = await repo.findBySlug(tenantId, 'slug');
      expect(notFoundSlug).toBeNull();

      mockResults.push([row]);
      const allDocs = await repo.findAll(tenantId);
      expect(allDocs.length).toBe(1);
    });

    it('should save (insert/update) and delete (soft-delete) document', async () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Title',
        slug: 'slug',
        documentType: DocumentTypeEnum.PDF,
        status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.PENDING,
        ingestionStatus: IngestionStatusEnum.PENDING,
        embeddingStatus: EmbeddingStatusEnum.PENDING,
      });

      mockResults.push([]); // insert path
      await repo.save(doc, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: docId }]); // update path
      await repo.save(doc, tenantId);
      expect(db.update).toHaveBeenCalled();

      mockResults.push([{ id: docId }]); // delete path
      const delTrue = await repo.delete(docId, tenantId);
      expect(delTrue).toBe(true);

      mockResults.push([]); // delete not found
      const delFalse = await repo.delete('missing', tenantId);
      expect(delFalse).toBe(false);
    });

    it('should findDocuments with query options', async () => {
      const row = {
        id: docId,
        tenantId,
        sourceId,
        title: 'Title',
        slug: 'slug',
        documentType: 'PDF',
        status: 'ACTIVE',
        language: 'en',
        version: 1,
        syncStatus: 'PENDING',
        ingestionStatus: 'PENDING',
        embeddingStatus: 'PENDING',
        chunkCount: 0,
      };

      mockResults.push([row], [row]); // count and rows query
      const res = await repo.findDocuments(tenantId, {
        sourceId,
        categoryId: catId,
        status: 'ACTIVE',
        language: 'en',
        search: 'test',
        page: 1,
        limit: 10,
      });

      expect(res.data.length).toBe(1);
    });
  });

  describe('Chunks operations', () => {
    it('should saveChunks within transaction, getChunks, and deleteChunks', async () => {
      const chunk = new KnowledgeChunk('chunk-1', {
        tenantId,
        documentId: docId,
        chunkIndex: 0,
        chunkHash: 'hash',
        content: 'content',
        tokenCount: 2,
      });

      mockResults.push([], []); // delete and insert results inside transaction
      await repo.saveChunks([chunk], tenantId);
      expect(db.transaction).toHaveBeenCalled();

      mockResults.push([
        {
          id: 'chunk-1',
          tenantId,
          documentId: docId,
          chunkIndex: 0,
          chunkHash: 'hash',
          content: 'content',
          tokenCount: 2,
        },
      ]);
      const chunks = await repo.getChunksByDocumentId(docId, tenantId);
      expect(chunks.length).toBe(1);

      await repo.deleteChunksByDocumentId(docId, tenantId);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('Categories and Tags', () => {
    it('should manage categories (insert, update, delete)', async () => {
      const cat = new KnowledgeCategory(catId, {
        tenantId,
        name: 'Cat',
        sortOrder: 1,
      });

      mockResults.push([]);
      await repo.saveCategory(cat, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: catId }]);
      await repo.saveCategory(cat, tenantId);
      expect(db.update).toHaveBeenCalled();

      mockResults.push([{ id: catId, tenantId, name: 'Cat', sortOrder: 1 }]);
      const found = await repo.getCategoryById(catId, tenantId);
      expect(found).toBeDefined();

      mockResults.push([]);
      const notFound = await repo.getCategoryById('missing', tenantId);
      expect(notFound).toBeNull();

      mockResults.push([{ id: catId, tenantId, name: 'Cat', sortOrder: 1 }]);
      const all = await repo.findCategories(tenantId);
      expect(all.length).toBe(1);

      mockResults.push([{ id: catId }]);
      const del = await repo.deleteCategory(catId, tenantId);
      expect(del).toBe(true);

      mockResults.push([]);
      const delFalse = await repo.deleteCategory('missing', tenantId);
      expect(delFalse).toBe(false);
    });

    it('should manage tags (insert, update, list)', async () => {
      const tag = new KnowledgeTag('tag-1', { tenantId, name: 'tag' });

      mockResults.push([]);
      await repo.saveTag(tag, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: 'tag-1' }]);
      await repo.saveTag(tag, tenantId);
      expect(db.update).toHaveBeenCalled();

      mockResults.push([{ id: 'tag-1', tenantId, name: 'tag' }]);
      const found = await repo.getTagByName('tag', tenantId);
      expect(found).toBeDefined();

      mockResults.push([]);
      const notFound = await repo.getTagByName('missing', tenantId);
      expect(notFound).toBeNull();

      mockResults.push([{ id: 'tag-1', tenantId, name: 'tag' }]);
      const all = await repo.findTags(tenantId);
      expect(all.length).toBe(1);
    });
  });

  describe('Versions & Search Logs & Sync Jobs', () => {
    it('should manage versions', async () => {
      const ver = new KnowledgeVersion('ver-1', {
        tenantId,
        documentId: docId,
        versionNumber: 1,
      });
      await repo.saveVersion(ver, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([
        { id: 'ver-1', tenantId, documentId: docId, versionNumber: 1 },
      ]);
      const versions = await repo.getVersionsByDocumentId(docId, tenantId);
      expect(versions.length).toBe(1);
    });

    it('should manage search logs', async () => {
      const log = new KnowledgeSearchLog('log-1', {
        tenantId,
        query: 'test',
        resultsCount: 1,
        latencyMs: 50,
        source: 'API',
      });
      await repo.addSearchLog(log, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([
        {
          id: 'log-1',
          tenantId,
          query: 'test',
          resultsCount: 1,
          latencyMs: 50,
          source: 'API',
        },
      ]);
      const logs = await repo.getSearchLogs(tenantId);
      expect(logs.length).toBe(1);
    });

    it('should manage sync jobs', async () => {
      const job = new KnowledgeSyncJob('job-1', {
        tenantId,
        sourceId,
        jobType: 'CRAWL',
        status: 'PENDING',
      });

      mockResults.push([]);
      await repo.saveSyncJob(job, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: 'job-1' }]);
      await repo.saveSyncJob(job, tenantId);
      expect(db.update).toHaveBeenCalled();

      mockResults.push([
        {
          id: 'job-1',
          tenantId,
          sourceId,
          jobType: 'CRAWL',
          status: 'PENDING',
          totalItems: 0,
          processedItems: 0,
          failedItems: 0,
        },
      ]);
      const found = await repo.getSyncJobById('job-1', tenantId);
      expect(found).toBeDefined();

      mockResults.push([]);
      const notFound = await repo.getSyncJobById('missing', tenantId);
      expect(notFound).toBeNull();

      mockResults.push([
        {
          id: 'job-1',
          tenantId,
          sourceId,
          jobType: 'CRAWL',
          status: 'PENDING',
          totalItems: 0,
          processedItems: 0,
          failedItems: 0,
        },
      ]);
      const all = await repo.findSyncJobs(tenantId, sourceId);
      expect(all.length).toBe(1);
    });
  });

  describe('Permissions operations', () => {
    it('should save, get, and delete permission', async () => {
      const perm = new KnowledgePermission('perm-1', {
        tenantId,
        documentId: docId,
        role: 'agent',
        accessLevel: 'READ',
      });

      mockResults.push([]);
      await repo.savePermission(perm, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: 'perm-1' }]);
      await repo.savePermission(perm, tenantId);
      expect(db.update).toHaveBeenCalled();

      mockResults.push([
        {
          id: 'perm-1',
          tenantId,
          documentId: docId,
          role: 'agent',
          accessLevel: 'READ',
        },
      ]);
      const perms = await repo.getPermissionsByDocumentId(docId, tenantId);
      expect(perms.length).toBe(1);

      mockResults.push([{ id: 'perm-1' }]);
      const del = await repo.deletePermission('perm-1', tenantId);
      expect(del).toBe(true);

      mockResults.push([]);
      const delFalse = await repo.deletePermission('missing', tenantId);
      expect(delFalse).toBe(false);
    });

    it('should checkPermission with various parameters', async () => {
      // 1. Inherit default access when no rules exist
      mockResults.push([]);
      let allowed = await repo.checkPermission(
        docId,
        tenantId,
        'team-1',
        'agent',
        'READ',
      );
      expect(allowed).toBe(true);

      // 2. Allowed matches role and role has write access level
      mockResults.push([
        {
          id: 'perm-1',
          tenantId,
          documentId: docId,
          role: 'agent',
          accessLevel: 'WRITE',
        },
      ]);
      allowed = await repo.checkPermission(
        docId,
        tenantId,
        undefined,
        'agent',
        'READ',
      );
      expect(allowed).toBe(true);

      // 3. Allowed matches team and team has write access level
      mockResults.push([
        {
          id: 'perm-2',
          tenantId,
          documentId: docId,
          teamId: 'team-1',
          accessLevel: 'WRITE',
        },
      ]);
      allowed = await repo.checkPermission(
        docId,
        tenantId,
        'team-1',
        'agent',
        'WRITE',
      );
      expect(allowed).toBe(true);

      // 4. Disallowed matches team but level is insufficient
      mockResults.push([
        {
          id: 'perm-3',
          tenantId,
          documentId: docId,
          teamId: 'team-1',
          accessLevel: 'READ',
        },
      ]);
      allowed = await repo.checkPermission(
        docId,
        tenantId,
        'team-1',
        'agent',
        'WRITE',
      );
      expect(allowed).toBe(false);

      // 5. Allowed matches public (no team and no role)
      mockResults.push([
        { id: 'perm-4', tenantId, documentId: docId, accessLevel: 'READ' },
      ]);
      allowed = await repo.checkPermission(
        docId,
        tenantId,
        'team-1',
        'agent',
        'READ',
      );
      expect(allowed).toBe(true);
    });
  });
});
