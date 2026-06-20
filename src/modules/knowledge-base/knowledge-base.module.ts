import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// TypeORM entities registered for AppModule compatibility
import { KnowledgeDocument as TypeOrmKnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeSource as TypeOrmKnowledgeSource } from './entities/knowledge-source.entity';
import { KnowledgeChunk as TypeOrmKnowledgeChunk } from './entities/knowledge-chunk.entity';

// Controllers
import {
  KnowledgeSourceController,
  KnowledgeDocumentController,
  KnowledgeCategoryController,
  KnowledgeSearchController,
  KnowledgeVersionController,
} from './controllers';

// Services
import {
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
} from './services';

// Repositories
import { DrizzleKnowledgeRepository } from './repositories/drizzle-knowledge.repository';

// Queue
import { KnowledgeQueueProcessor } from './jobs/knowledge-queue.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TypeOrmKnowledgeDocument,
      TypeOrmKnowledgeSource,
      TypeOrmKnowledgeChunk,
    ]),
    BullModule.registerQueue({
      name: 'knowledge-queue',
    }),
  ],
  controllers: [
    KnowledgeSourceController,
    KnowledgeDocumentController,
    KnowledgeCategoryController,
    KnowledgeSearchController,
    KnowledgeVersionController,
  ],
  providers: [
    // Repositories
    {
      provide: 'IKnowledgeRepository',
      useClass: DrizzleKnowledgeRepository,
    },

    // Event Publisher
    KnowledgeEventPublisher,

    // Clients & Helpers
    AIPlatformClient,
    CrawlerService,

    // Services
    KnowledgeSourceService,
    KnowledgeDocumentService,
    KnowledgeChunkService,
    KnowledgeCategoryService,
    KnowledgeVersionService,
    KnowledgePermissionService,
    KnowledgeSyncService,
    KnowledgeSearchService,

    // Queue Processor
    KnowledgeQueueProcessor,
  ],
  exports: [
    KnowledgeSourceService,
    KnowledgeDocumentService,
    KnowledgeChunkService,
    KnowledgeCategoryService,
    KnowledgeVersionService,
    KnowledgePermissionService,
    KnowledgeSyncService,
    KnowledgeSearchService,
    'IKnowledgeRepository',
  ],
})
export class KnowledgeBaseModule {}
