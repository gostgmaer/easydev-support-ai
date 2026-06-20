import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import axios from 'axios';

// Services
import { KnowledgeSourceService } from '../services/knowledge-source.service';
import { KnowledgeDocumentService } from '../services/knowledge-document.service';
import { KnowledgeChunkService } from '../services/knowledge-chunk.service';
import { KnowledgeCategoryService } from '../services/knowledge-category.service';
import { KnowledgeVersionService } from '../services/knowledge-version.service';
import { KnowledgePermissionService } from '../services/knowledge-permission.service';
import { KnowledgeSyncService } from '../services/knowledge-sync.service';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { AIPlatformClient } from '../services/ai-platform.client';
import { CrawlerService } from '../services/crawler.service';
import { KnowledgeEventPublisher } from '../services/knowledge-event.publisher';

// Controllers
import {
  KnowledgeSourceController,
  KnowledgeDocumentController,
  KnowledgeCategoryController,
  KnowledgeSearchController,
  KnowledgeVersionController,
} from '../controllers';

// Jobs & Queues
import { KnowledgeQueueProcessor } from '../jobs/knowledge-queue.processor';
import { QueueService, QUEUES } from '@easydev/shared-queues';

// Domain Entities / Aggregates
import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';
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

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Knowledge Module Services and Controllers', () => {
  let sourceService: KnowledgeSourceService;
  let documentService: KnowledgeDocumentService;
  let chunkService: KnowledgeChunkService;
  let categoryService: KnowledgeCategoryService;
  let versionService: KnowledgeVersionService;
  let permissionService: KnowledgePermissionService;
  let syncService: KnowledgeSyncService;
  let searchService: KnowledgeSearchService;
  let crawlerService: CrawlerService;
  let aiClient: AIPlatformClient;
  let eventPublisher: KnowledgeEventPublisher;
  let queueProcessor: KnowledgeQueueProcessor;

  // Controllers
  let sourceController: KnowledgeSourceController;
  let documentController: KnowledgeDocumentController;
  let categoryController: KnowledgeCategoryController;
  let searchController: KnowledgeSearchController;
  let versionController: KnowledgeVersionController;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const sourceId = '22222222-2222-2222-2222-222222222222';
  const docId = '33333333-3333-3333-3333-333333333333';
  const catId = '44444444-4444-4444-4444-444444444444';

  const mockRepo = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    saveSource: jest.fn(),
    getSourceById: jest.fn(),
    findSources: jest.fn(),
    deleteSource: jest.fn(),
    saveChunks: jest.fn(),
    getChunksByDocumentId: jest.fn(),
    deleteChunksByDocumentId: jest.fn(),
    saveCategory: jest.fn(),
    getCategoryById: jest.fn(),
    findCategories: jest.fn(),
    deleteCategory: jest.fn(),
    saveTag: jest.fn(),
    getTagByName: jest.fn(),
    findTags: jest.fn(),
    saveVersion: jest.fn(),
    getVersionsByDocumentId: jest.fn(),
    savePermission: jest.fn(),
    getPermissionsByDocumentId: jest.fn(),
    deletePermission: jest.fn(),
    checkPermission: jest.fn(),
    saveSyncJob: jest.fn(),
    getSyncJobById: jest.fn(),
    findSyncJobs: jest.fn(),
    addSearchLog: jest.fn(),
    getSearchLogs: jest.fn(),
    findDocuments: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        KnowledgeSourceController,
        KnowledgeDocumentController,
        KnowledgeCategoryController,
        KnowledgeSearchController,
        KnowledgeVersionController,
      ],
      providers: [
        KnowledgeSourceService,
        KnowledgeDocumentService,
        KnowledgeChunkService,
        KnowledgeCategoryService,
        KnowledgeVersionService,
        KnowledgePermissionService,
        KnowledgeSyncService,
        KnowledgeSearchService,
        AIPlatformClient,
        CrawlerService,
        KnowledgeEventPublisher,
        KnowledgeQueueProcessor,
        {
          provide: 'IKnowledgeRepository',
          useValue: mockRepo,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    sourceService = module.get<KnowledgeSourceService>(KnowledgeSourceService);
    documentService = module.get<KnowledgeDocumentService>(KnowledgeDocumentService);
    chunkService = module.get<KnowledgeChunkService>(KnowledgeChunkService);
    categoryService = module.get<KnowledgeCategoryService>(KnowledgeCategoryService);
    versionService = module.get<KnowledgeVersionService>(KnowledgeVersionService);
    permissionService = module.get<KnowledgePermissionService>(KnowledgePermissionService);
    syncService = module.get<KnowledgeSyncService>(KnowledgeSyncService);
    searchService = module.get<KnowledgeSearchService>(KnowledgeSearchService);
    crawlerService = module.get<CrawlerService>(CrawlerService);
    aiClient = module.get<AIPlatformClient>(AIPlatformClient);
    eventPublisher = module.get<KnowledgeEventPublisher>(KnowledgeEventPublisher);
    queueProcessor = module.get<KnowledgeQueueProcessor>(KnowledgeQueueProcessor);

    sourceController = module.get<KnowledgeSourceController>(KnowledgeSourceController);
    documentController = module.get<KnowledgeDocumentController>(KnowledgeDocumentController);
    categoryController = module.get<KnowledgeCategoryController>(KnowledgeCategoryController);
    searchController = module.get<KnowledgeSearchController>(KnowledgeSearchController);
    versionController = module.get<KnowledgeVersionController>(KnowledgeVersionController);
  });

  describe('CrawlerService', () => {
    it('should crawl a website successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <html>
            <head><title>Scraped Page</title></head>
            <body>
              <p>Hello world from easydev support AI!</p>
              <a href="https://example.com/about">About us</a>
              <a href="javascript:void(0)">No-op</a>
            </body>
          </html>
        `,
      });

      const pages = await crawlerService.crawlWebsite('https://example.com', 1, 0);
      expect(pages.length).toBe(1);
      expect(pages[0].title).toBe('Scraped Page');
      expect(pages[0].content).toContain('Hello world');
      expect(pages[0].checksum).toBeDefined();
    });

    it('should handle crawl errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const pages = await crawlerService.crawlWebsite('https://example.com', 1, 0);
      expect(pages.length).toBe(0);
    });

    it('should parse a sitemap successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <?xml version="1.0" encoding="UTF-8"?>
          <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url><loc>https://example.com/page-1</loc></url>
            <url><loc>https://example.com/page-2</loc></url>
          </urlset>
        `,
      });

      const urls = await crawlerService.parseSitemap('https://example.com/sitemap.xml');
      expect(urls.length).toBe(2);
      expect(urls).toContain('https://example.com/page-1');
    });

    it('should handle sitemap fetch errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('500 Internal Error'));
      const urls = await crawlerService.parseSitemap('https://example.com/sitemap.xml');
      expect(urls.length).toBe(0);
    });
  });

  describe('AIPlatformClient', () => {
    it('should trigger document ingestion', async () => {
      const mockResult = { jobId: 'job-123', status: 'PROCESSING', chunks: [{ content: 'c1', tokenCount: 10, hash: 'h1' }] };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResult });

      const res = await aiClient.ingestDocument(tenantId, docId, 'https://file.url', 'application/pdf');
      expect(res.jobId).toBe('job-123');
      expect(res.chunks?.length).toBe(1);
    });

    it('should generate embeddings', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { embeddings: [[0.1, 0.2]] } });
      const res = await aiClient.embedTexts(tenantId, ['hello']);
      expect(res.embeddings.length).toBe(1);
    });

    it('should rerank documents', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { results: [{ index: 0, score: 0.95 }] } });
      const res = await aiClient.rerank(tenantId, 'query', ['doc1']);
      expect(res.results[0].score).toBe(0.95);
    });
  });

  describe('KnowledgeSourceService', () => {
    it('should create and save a source', async () => {
      const dto = { name: 'Support PDF', sourceType: SourceTypeEnum.PDF, uri: 'https://docs.com/doc.pdf' };
      mockRepo.saveSource.mockImplementationOnce((src) => Promise.resolve(src));

      const source = await sourceService.createSource(tenantId, dto);
      expect(source.name).toBe('Support PDF');
      expect(source.sourceType).toBe(SourceTypeEnum.PDF);
      expect(mockRepo.saveSource).toHaveBeenCalled();
    });

    it('should throw NotFoundException if source not found', async () => {
      mockRepo.getSourceById.mockResolvedValueOnce(null);
      await expect(sourceService.getSource(tenantId, sourceId)).rejects.toThrow(NotFoundException);
    });

    it('should update an existing source', async () => {
      const source = KnowledgeSource.create(sourceId, { tenantId, name: 'Old Name', sourceType: SourceTypeEnum.MANUAL });
      mockRepo.getSourceById.mockResolvedValueOnce(source);
      mockRepo.saveSource.mockImplementationOnce((src) => Promise.resolve(src));

      const updated = await sourceService.updateSource(tenantId, sourceId, { name: 'New Name' });
      expect(updated.name).toBe('New Name');
    });

    it('should delete a source successfully', async () => {
      mockRepo.deleteSource.mockResolvedValueOnce(true);
      const res = await sourceService.deleteSource(tenantId, sourceId);
      expect(res).toBe(true);
    });
  });

  describe('KnowledgeCategoryService', () => {
    it('should create, get, find, update and delete a category', async () => {
      const category = new KnowledgeCategory(catId, { tenantId, name: 'Support API', sortOrder: 1 });
      mockRepo.saveCategory.mockResolvedValueOnce(category);
      mockRepo.getCategoryById.mockResolvedValueOnce(category);
      mockRepo.findCategories.mockResolvedValueOnce([category]);
      mockRepo.deleteCategory.mockResolvedValueOnce(true);

      const created = await categoryService.createCategory(tenantId, { name: 'Support API', sortOrder: 1 });
      expect(created.name).toBe('Support API');

      const got = await categoryService.getCategory(tenantId, catId);
      expect(got.id).toBe(catId);

      mockRepo.getCategoryById.mockResolvedValueOnce(null);
      await expect(categoryService.getCategory(tenantId, 'missing')).rejects.toThrow(NotFoundException);

      const all = await categoryService.findCategories(tenantId);
      expect(all.length).toBe(1);

      mockRepo.getCategoryById.mockResolvedValueOnce(category);
      mockRepo.saveCategory.mockResolvedValueOnce(category);
      const updated = await categoryService.updateCategory(tenantId, catId, { name: 'Support API v2' });
      expect(updated.name).toBe('Support API v2');

      const del = await categoryService.deleteCategory(tenantId, catId);
      expect(del).toBe(true);

      mockRepo.deleteCategory.mockResolvedValueOnce(false);
      await expect(categoryService.deleteCategory(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('KnowledgePermissionService extra methods', () => {
    it('should add, get and delete permissions', async () => {
      const perm = new KnowledgePermission('perm-1', { tenantId, documentId: docId, role: 'agent', accessLevel: 'READ' });
      mockRepo.savePermission.mockResolvedValueOnce(perm);
      mockRepo.getPermissionsByDocumentId.mockResolvedValueOnce([perm]);
      mockRepo.deletePermission.mockResolvedValueOnce(true);

      const added = await permissionService.addPermission(tenantId, docId, { role: 'agent', accessLevel: 'READ' });
      expect(added.role).toBe('agent');

      const all = await permissionService.getPermissions(tenantId, docId);
      expect(all.length).toBe(1);

      const deleted = await permissionService.deletePermission(tenantId, 'perm-1');
      expect(deleted).toBe(true);

      mockRepo.deletePermission.mockResolvedValueOnce(false);
      await expect(permissionService.deletePermission(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('KnowledgeDocumentService', () => {
    it('should create a document', async () => {
      const dto = {
        sourceId,
        title: 'User Guide',
        slug: 'user-guide',
        documentType: DocumentTypeEnum.MARKDOWN,
        language: 'en',
      };
      mockRepo.save.mockImplementationOnce((doc) => Promise.resolve(doc));

      const doc = await documentService.createDocument(tenantId, dto);
      expect(doc.title).toBe('User Guide');
      expect(doc.slug).toBe('user-guide');
    });

    it('should throw NotFoundException if getDocument is null', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      await expect(documentService.getDocument(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('should delete a document or throw NotFoundException', async () => {
      mockRepo.delete.mockResolvedValueOnce(true);
      expect(await documentService.deleteDocument(tenantId, docId)).toBe(true);

      mockRepo.delete.mockResolvedValueOnce(false);
      await expect(documentService.deleteDocument(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('should publish a document and snapshot the version', async () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Title',
        slug: 'slug',
        documentType: DocumentTypeEnum.TXT,
        status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.PENDING,
        ingestionStatus: IngestionStatusEnum.PENDING,
        embeddingStatus: EmbeddingStatusEnum.PENDING,
      });

      mockRepo.findById.mockResolvedValueOnce(doc);
      mockRepo.save.mockImplementationOnce((d) => Promise.resolve(d));
      mockRepo.saveVersion.mockResolvedValueOnce({});

      const published = await documentService.publishDocument(tenantId, docId, { changeSummary: 'First publication' }, 'user-1');
      expect(published.status.value).toBe(DocumentStatusEnum.ACTIVE);
      expect(published.version).toBe(2);
      expect(mockRepo.saveVersion).toHaveBeenCalled();
    });

    it('should archive a document', async () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Title',
        slug: 'slug',
        documentType: DocumentTypeEnum.TXT,
        status: DocumentStatus.create(DocumentStatusEnum.ACTIVE),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.SYNCED,
        ingestionStatus: IngestionStatusEnum.INGESTED,
        embeddingStatus: EmbeddingStatusEnum.EMBEDDED,
      });

      mockRepo.findById.mockResolvedValueOnce(doc);
      mockRepo.save.mockImplementationOnce((d) => Promise.resolve(d));

      const archived = await documentService.archiveDocument(tenantId, docId, 'user-1');
      expect(archived.status.value).toBe(DocumentStatusEnum.ARCHIVED);
    });
  });

  describe('KnowledgePermissionService', () => {
    it('should check permissions properly', async () => {
      mockRepo.checkPermission.mockImplementation((docId, tenantId, teamId, role, requiredLevel) => {
        if (role === 'tenant_admin') return Promise.resolve(true);
        if (role === 'agent' && teamId === 'team-2' && requiredLevel === 'READ') return Promise.resolve(true);
        if (role === 'agent' && teamId === 'team-1' && requiredLevel === 'WRITE') return Promise.resolve(true);
        if (role === 'agent' && teamId === 'team-1' && requiredLevel === 'MANAGE') return Promise.resolve(false);
        return Promise.resolve(false);
      });

      // 1. Tenant Admin has universal access
      let allowed = await permissionService.checkAccess(tenantId, docId, 'team-1', 'tenant_admin', 'WRITE');
      expect(allowed).toBe(true);

      // 2. Permission match wildcard roles
      allowed = await permissionService.checkAccess(tenantId, docId, 'team-2', 'agent', 'READ');
      expect(allowed).toBe(true);

      // 3. Team match write
      allowed = await permissionService.checkAccess(tenantId, docId, 'team-1', 'agent', 'WRITE');
      expect(allowed).toBe(true);

      // 4. Insufficient role access level
      allowed = await permissionService.checkAccess(tenantId, docId, 'team-1', 'agent', 'MANAGE');
      expect(allowed).toBe(false);
    });
  });

  describe('KnowledgeSyncService', () => {
    it('should trigger ingestion flow', async () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Manual Text',
        slug: 'manual-text',
        documentType: DocumentTypeEnum.TXT,
        status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.PENDING,
        ingestionStatus: IngestionStatusEnum.PENDING,
        embeddingStatus: EmbeddingStatusEnum.PENDING,
        fileUrl: 'https://docs.com/text.txt',
      });

      mockRepo.findById.mockResolvedValue(doc);
      mockRepo.saveSyncJob.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(doc);
      mockRepo.saveVersion.mockResolvedValue(null);
      mockRepo.saveChunks.mockResolvedValue([]);

      // Mock AI client to return chunks
      jest.spyOn(aiClient, 'ingestDocument').mockResolvedValueOnce({
        jobId: 'ai-job-1',
        status: 'COMPLETED',
        chunks: [
          { content: 'Chunk one content', tokenCount: 4, hash: 'h1' },
          { content: 'Chunk two content', tokenCount: 4, hash: 'h2' },
        ],
      });

      await syncService.triggerIngestion(tenantId, docId);

      expect(doc.chunkCount).toBe(2);
      expect(doc.status.value).toBe(DocumentStatusEnum.ACTIVE);
      expect(doc.embeddingStatus).toBe(EmbeddingStatusEnum.EMBEDDED);
    });

    it('should throw BadRequestException if document is missing during ingestion trigger', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      await expect(syncService.triggerIngestion(tenantId, docId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if document lacks url or uri', async () => {
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
      mockRepo.findById.mockResolvedValueOnce(doc);
      await expect(syncService.triggerIngestion(tenantId, docId)).rejects.toThrow(BadRequestException);
    });

    it('should handle triggerIngestion errors gracefully and fail the document status', async () => {
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
        fileUrl: 'https://docs.com/doc.pdf',
      });
      mockRepo.findById.mockResolvedValueOnce(doc);
      jest.spyOn(aiClient, 'ingestDocument').mockRejectedValueOnce(new Error('AI platform offline'));

      await syncService.triggerIngestion(tenantId, docId);
      expect(doc.status.value).toBe(DocumentStatusEnum.FAILED);
      expect(doc.syncStatus).toBe(SyncStatusEnum.FAILED);
    });

    it('should throw BadRequestException when triggering website crawl for missing source', async () => {
      mockRepo.getSourceById.mockResolvedValueOnce(null);
      await expect(syncService.triggerWebsiteCrawl(tenantId, sourceId)).rejects.toThrow(BadRequestException);
    });

    it('should trigger website crawl and enqueue BullMQ job', async () => {
      const source = KnowledgeSource.create(sourceId, {
        tenantId,
        name: 'Website',
        sourceType: SourceTypeEnum.WEBSITE,
        uri: 'https://mysite.com',
      });
      mockRepo.getSourceById.mockResolvedValueOnce(source);
      await syncService.triggerWebsiteCrawl(tenantId, sourceId);
      expect(mockQueueService.addJob).toHaveBeenCalledWith(QUEUES.KNOWLEDGE, 'knowledge-crawl-job', expect.any(Object));
    });

    it('should return early from processCrawlJob if job or source is missing', async () => {
      mockRepo.getSyncJobById.mockResolvedValueOnce(null);
      await syncService.processCrawlJob(tenantId, sourceId, 'sync-job-1');
      expect(mockRepo.saveSyncJob).not.toHaveBeenCalled();
    });

    it('should process website crawl job and import urls', async () => {
      const source = KnowledgeSource.create(sourceId, {
        tenantId,
        name: 'Website source',
        sourceType: SourceTypeEnum.WEBSITE,
        uri: 'https://mysite.com',
        config: { maxPages: 2, rateLimitMs: 0 },
      });

      const syncJob = new KnowledgeSyncJob('sync-job-1', {
        tenantId,
        sourceId,
        jobType: 'CRAWL',
        status: 'PENDING',
      });

      mockRepo.getSyncJobById.mockResolvedValueOnce(syncJob);
      mockRepo.getSourceById.mockResolvedValueOnce(source);
      mockRepo.saveSyncJob.mockResolvedValue(null);
      mockRepo.saveSource.mockResolvedValue(null);

      jest.spyOn(crawlerService, 'crawlWebsite').mockResolvedValueOnce([
        { url: 'https://mysite.com/home', title: 'Home', content: 'Welcome to home', checksum: 'c1' },
        { url: 'https://mysite.com/docs', title: 'Docs', content: 'Our API Docs', checksum: 'c2' },
      ]);

      // Mock creation and ingestion on nested calls
      jest.spyOn(documentService, 'createDocument').mockImplementation((tenId, dto) => {
        return Promise.resolve(
          KnowledgeDocument.create('doc-tmp', {
            tenantId: tenId,
            sourceId: dto.sourceId,
            title: dto.title,
            slug: dto.slug,
            documentType: dto.documentType,
            status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
            language: DocumentLanguage.create(dto.language),
            version: 1,
            syncStatus: SyncStatusEnum.PENDING,
            ingestionStatus: IngestionStatusEnum.PENDING,
            embeddingStatus: EmbeddingStatusEnum.PENDING,
          }),
        );
      });

      jest.spyOn(syncService, 'triggerIngestion').mockResolvedValue(undefined);

      await syncService.processCrawlJob(tenantId, sourceId, 'sync-job-1');

      expect(syncJob.status).toBe('COMPLETED');
      expect(source.syncStatus).toBe(SyncStatusEnum.SYNCED);
    });

    it('should process sitemap crawl job and import URLs', async () => {
      const source = KnowledgeSource.create(sourceId, {
        tenantId,
        name: 'Sitemap source',
        sourceType: SourceTypeEnum.WEBSITE,
        uri: 'https://mysite.com',
        config: { sitemapUrl: 'https://mysite.com/sitemap.xml' },
      });

      const syncJob = new KnowledgeSyncJob('sync-job-2', {
        tenantId,
        sourceId,
        jobType: 'CRAWL',
        status: 'PENDING',
      });

      mockRepo.getSyncJobById.mockResolvedValueOnce(syncJob);
      mockRepo.getSourceById.mockResolvedValueOnce(source);
      mockRepo.saveSyncJob.mockResolvedValue(null);
      mockRepo.saveSource.mockResolvedValue(null);

      jest.spyOn(crawlerService, 'parseSitemap').mockResolvedValueOnce([
        'https://mysite.com/page1',
        'https://mysite.com/page2',
      ]);

      jest.spyOn(documentService, 'createDocument').mockImplementation((tenId, dto) => {
        return Promise.resolve(
          KnowledgeDocument.create('doc-tmp-sitemap', {
            tenantId: tenId,
            sourceId: dto.sourceId,
            title: dto.title,
            slug: dto.slug,
            documentType: dto.documentType,
            status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
            language: DocumentLanguage.create(dto.language),
            version: 1,
            syncStatus: SyncStatusEnum.PENDING,
            ingestionStatus: IngestionStatusEnum.PENDING,
            embeddingStatus: EmbeddingStatusEnum.PENDING,
          }),
        );
      });

      jest.spyOn(syncService, 'triggerIngestion').mockResolvedValue(undefined);

      await syncService.processCrawlJob(tenantId, sourceId, 'sync-job-2');

      expect(syncJob.status).toBe('COMPLETED');
      expect(source.syncStatus).toBe(SyncStatusEnum.SYNCED);
    });
  });

  describe('KnowledgeSearchService', () => {
    it('should search keyword only when query is short', async () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Standard Procedure',
        slug: 'sop',
        documentType: DocumentTypeEnum.PDF,
        status: DocumentStatus.create(DocumentStatusEnum.ACTIVE),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.SYNCED,
        ingestionStatus: IngestionStatusEnum.INGESTED,
        embeddingStatus: EmbeddingStatusEnum.EMBEDDED,
      });

      mockRepo.findDocuments.mockResolvedValueOnce({ data: [doc], total: 1 });
      mockRepo.addSearchLog.mockResolvedValueOnce(null);

      const results = await searchService.search(tenantId, { query: 'hi' });
      expect(results.length).toBe(1);
      expect(results[0].document.title).toBe('Standard Procedure');
      expect(results[0].score).toBe(1.0);
    });

    it('should perform AI reranking for substantive query', async () => {
      const doc1 = KnowledgeDocument.create('doc-1', {
        tenantId,
        sourceId,
        title: 'Guide Book',
        slug: 'guide-1',
        documentType: DocumentTypeEnum.PDF,
        status: DocumentStatus.create(DocumentStatusEnum.ACTIVE),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.SYNCED,
        ingestionStatus: IngestionStatusEnum.INGESTED,
        embeddingStatus: EmbeddingStatusEnum.EMBEDDED,
      });

      const doc2 = KnowledgeDocument.create('doc-2', {
        tenantId,
        sourceId,
        title: 'Developer manual',
        slug: 'guide-2',
        documentType: DocumentTypeEnum.PDF,
        status: DocumentStatus.create(DocumentStatusEnum.ACTIVE),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.SYNCED,
        ingestionStatus: IngestionStatusEnum.INGESTED,
        embeddingStatus: EmbeddingStatusEnum.EMBEDDED,
      });

      mockRepo.findDocuments.mockResolvedValueOnce({ data: [doc1, doc2], total: 2 });
      mockRepo.addSearchLog.mockResolvedValueOnce(null);

      jest.spyOn(aiClient, 'rerank').mockResolvedValueOnce({
        results: [
          { index: 0, score: 0.2 },
          { index: 1, score: 0.99 },
        ],
      });

      const results = await searchService.search(tenantId, { query: 'Developer guide manual instructions' });
      expect(results.length).toBe(2);
      expect(results[0].document.title).toBe('Developer manual');
      expect(results[0].score).toBe(0.99);
    });
  });

  describe('KnowledgeQueueProcessor', () => {
    it('should handle crawl job', async () => {
      jest.spyOn(syncService, 'processCrawlJob').mockResolvedValueOnce(undefined);

      const job: any = {
        id: 'job-1',
        name: 'knowledge-crawl-job',
        data: {
          tenantId,
          sourceId,
          jobId: 'sync-job-1',
        },
      };

      await queueProcessor.handleJob(job);
      expect(syncService.processCrawlJob).toHaveBeenCalledWith(tenantId, sourceId, 'sync-job-1');
    });

    it('should handle index and cleanup jobs', async () => {
      const jobIndex: any = {
        id: 'job-idx',
        name: 'knowledge-index-job',
        data: { tenantId, documentId: docId },
      };
      const resIdx = await queueProcessor.handleJob(jobIndex);
      expect(resIdx.indexed).toBe(true);

      const jobClean: any = {
        id: 'job-cln',
        name: 'knowledge-cleanup-job',
        data: { tenantId },
      };
      const resCln = await queueProcessor.handleJob(jobClean);
      expect(resCln.cleaned).toBe(true);
    });

    it('should throw error for unknown job type', async () => {
      const job: any = { id: 'x', name: 'unknown-job', data: {} };
      await expect(queueProcessor.handleJob(job)).rejects.toThrow();
    });
  });

  describe('Controllers', () => {
    it('SourceController CRUD', async () => {
      const source = KnowledgeSource.create(sourceId, { tenantId, name: 'S1', sourceType: SourceTypeEnum.CSV });
      jest.spyOn(sourceService, 'createSource').mockResolvedValueOnce(source);
      jest.spyOn(sourceService, 'getSource').mockResolvedValueOnce(source);
      jest.spyOn(sourceService, 'findSources').mockResolvedValueOnce({ data: [source], total: 1 });
      jest.spyOn(sourceService, 'updateSource').mockResolvedValueOnce(source);
      jest.spyOn(sourceService, 'deleteSource').mockResolvedValueOnce(true);
      jest.spyOn(syncService, 'triggerWebsiteCrawl').mockResolvedValueOnce(undefined);

      expect(await sourceController.createSource(tenantId, { name: 'S1', sourceType: SourceTypeEnum.CSV })).toBeDefined();
      expect(await sourceController.getSource(tenantId, sourceId)).toBeDefined();
      expect(await sourceController.findSources(tenantId, {})).toBeDefined();
      expect(await sourceController.updateSource(tenantId, sourceId, { name: 'New S1' })).toBeDefined();
      await sourceController.deleteSource(tenantId, sourceId);
      expect(await sourceController.triggerSync(tenantId, sourceId)).toEqual({ status: 'sync_triggered' });
    });

    it('CategoryController CRUD', async () => {
      const category = new KnowledgeCategory(catId, { tenantId, name: 'Cat1', sortOrder: 1 });
      jest.spyOn(categoryService, 'createCategory').mockResolvedValueOnce(category);
      jest.spyOn(categoryService, 'getCategory').mockResolvedValueOnce(category);
      jest.spyOn(categoryService, 'findCategories').mockResolvedValueOnce([category]);
      jest.spyOn(categoryService, 'updateCategory').mockResolvedValueOnce(category);
      jest.spyOn(categoryService, 'deleteCategory').mockResolvedValueOnce(true);

      expect(await categoryController.createCategory(tenantId, { name: 'Cat1', sortOrder: 1 })).toBeDefined();
      expect(await categoryController.getCategory(tenantId, catId)).toBeDefined();
      expect(await categoryController.findCategories(tenantId)).toBeDefined();
      expect(await categoryController.updateCategory(tenantId, catId, { name: 'Cat2' })).toBeDefined();
      await categoryController.deleteCategory(tenantId, catId);
    });

    it('DocumentController Operations', async () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Doc',
        slug: 'doc',
        documentType: DocumentTypeEnum.PDF,
        status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.PENDING,
        ingestionStatus: IngestionStatusEnum.PENDING,
        embeddingStatus: EmbeddingStatusEnum.PENDING,
      });

      jest.spyOn(permissionService, 'checkAccess').mockResolvedValue(true);
      jest.spyOn(documentService, 'createDocument').mockResolvedValueOnce(doc);
      jest.spyOn(documentService, 'getDocument').mockResolvedValueOnce(doc);
      jest.spyOn(documentService, 'findDocuments').mockResolvedValueOnce({ data: [doc], total: 1 });
      jest.spyOn(documentService, 'updateDocument').mockResolvedValueOnce(doc);
      jest.spyOn(documentService, 'publishDocument').mockResolvedValueOnce(doc);
      jest.spyOn(documentService, 'archiveDocument').mockResolvedValueOnce(doc);
      jest.spyOn(documentService, 'deleteDocument').mockResolvedValueOnce(true);
      jest.spyOn(syncService, 'triggerIngestion').mockResolvedValueOnce(undefined);

      const perm = new KnowledgePermission('perm-1', { tenantId, documentId: docId, role: 'agent', accessLevel: 'READ' });
      jest.spyOn(permissionService, 'addPermission').mockResolvedValueOnce(perm);
      jest.spyOn(permissionService, 'getPermissions').mockResolvedValueOnce([perm]);
      jest.spyOn(permissionService, 'deletePermission').mockResolvedValueOnce(true);

      expect(await documentController.createDocument(tenantId, {
        sourceId,
        title: 'Doc',
        slug: 'doc',
        documentType: DocumentTypeEnum.PDF,
        language: 'en',
      })).toBeDefined();

      expect(await documentController.getDocument(tenantId, docId, 'agent', 'team-1')).toBeDefined();
      expect(await documentController.findDocuments(tenantId, {})).toBeDefined();
      expect(await documentController.updateDocument(tenantId, docId, { title: 'New Doc' }, 'agent', 'team-1')).toBeDefined();
      expect(await documentController.publishDocument(tenantId, docId, { changeSummary: 'Publish' }, 'user-1')).toBeDefined();
      expect(await documentController.archiveDocument(tenantId, docId, 'user-1')).toBeDefined();
      expect(await documentController.triggerIngest(tenantId, docId)).toEqual({ status: 'ingest_triggered' });

      // Test access denied on write
      jest.spyOn(permissionService, 'checkAccess').mockResolvedValueOnce(false);
      await expect(documentController.updateDocument(tenantId, docId, { title: 'New Doc' }, 'agent', 'team-1')).rejects.toThrow(ForbiddenException);

      // Permissions CRUD
      expect(await documentController.addPermission(tenantId, docId, { role: 'agent', accessLevel: 'READ' })).toBeDefined();
      expect(await documentController.getPermissions(tenantId, docId)).toBeDefined();
      await documentController.deletePermission(tenantId, 'perm-1');
    });

    it('SearchController & VersionController', async () => {
      jest.spyOn(searchService, 'search').mockResolvedValueOnce([]);
      jest.spyOn(versionService, 'getVersions').mockResolvedValueOnce([]);

      expect(await searchController.search(tenantId, { query: 'test' }, 'user-1')).toBeDefined();
      expect(await versionController.getVersions(tenantId, docId)).toBeDefined();
    });
  });
});
