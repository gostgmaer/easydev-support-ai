import { KnowledgeSource } from '../domain/knowledge-source.aggregate';
import { KnowledgeDocument } from '../domain/knowledge-document.aggregate';
import { KnowledgeCategory } from '../domain/knowledge-category.entity';
import { KnowledgeTag } from '../domain/knowledge-tag.entity';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
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

describe('Knowledge Domain Model', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const sourceId = '22222222-2222-2222-2222-222222222222';
  const docId = '33333333-3333-3333-3333-333333333333';

  describe('Value Objects', () => {
    it('should create valid DocumentStatus', () => {
      const status = DocumentStatus.create(DocumentStatusEnum.ACTIVE);
      expect(status.value).toBe(DocumentStatusEnum.ACTIVE);
    });

    it('should throw on invalid DocumentLanguage', () => {
      expect(() => DocumentLanguage.create('')).toThrow();
    });
  });

  describe('KnowledgeSource Aggregate', () => {
    it('should create source and publish event', () => {
      const source = KnowledgeSource.create(sourceId, {
        tenantId,
        name: 'Manual Source',
        sourceType: SourceTypeEnum.MANUAL,
        uri: 'file://manual-doc',
      });

      expect(source.id).toBe(sourceId);
      expect(source.syncStatus).toBe(SyncStatusEnum.PENDING);
      expect(source.domainEvents.length).toBe(1);
      expect(source.domainEvents[0].constructor.name).toBe('KnowledgeSourceCreatedEvent');
    });

    it('should manage sync progress states', () => {
      const source = KnowledgeSource.create(sourceId, {
        tenantId,
        name: 'Manual Source',
        sourceType: SourceTypeEnum.MANUAL,
      });

      source.startSync('job-1');
      expect(source.syncStatus).toBe(SyncStatusEnum.SYNCING);

      source.completeSync(5);
      expect(source.syncStatus).toBe(SyncStatusEnum.SYNCED);
      expect(source.documentCount).toBe(5);

      source.failSync('Failed parsing network');
      expect(source.syncStatus).toBe(SyncStatusEnum.FAILED);
      expect(source.lastError).toBe('Failed parsing network');
    });
  });

  describe('KnowledgeDocument Aggregate', () => {
    it('should track ingestion checkpoints', () => {
      const doc = KnowledgeDocument.create(docId, {
        tenantId,
        sourceId,
        title: 'Security Manual',
        slug: 'security-manual',
        documentType: DocumentTypeEnum.PDF,
        status: DocumentStatus.create(DocumentStatusEnum.DRAFT),
        language: DocumentLanguage.create('en'),
        version: 1,
        syncStatus: SyncStatusEnum.PENDING,
        ingestionStatus: IngestionStatusEnum.PENDING,
        embeddingStatus: EmbeddingStatusEnum.PENDING,
      });

      doc.startIngestion('job-ingest-1');
      expect(doc.status.value).toBe(DocumentStatusEnum.PROCESSING);
      expect(doc.ingestionStatus).toBe(IngestionStatusEnum.INGESTING);

      doc.completeIngestion(12);
      expect(doc.status.value).toBe(DocumentStatusEnum.INDEXING);
      expect(doc.chunkCount).toBe(12);

      doc.markEmbedded();
      expect(doc.status.value).toBe(DocumentStatusEnum.ACTIVE);
      expect(doc.embeddingStatus).toBe(EmbeddingStatusEnum.EMBEDDED);
    });
  });

  describe('KnowledgePermission Entity', () => {
    it('should validate roles and levels', () => {
      const perm = new KnowledgePermission('perm-1', {
        tenantId,
        documentId: docId,
        role: 'agent',
        accessLevel: 'READ',
      });

      expect(perm.accessLevel).toBe('READ');
      perm.updateAccessLevel('WRITE');
      expect(perm.accessLevel).toBe('WRITE');
    });
  });
});
