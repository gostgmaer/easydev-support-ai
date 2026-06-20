import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeSource } from './entities/knowledge-source.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeSource, KnowledgeChunk])],
  controllers: [KnowledgeController],
  providers: [KnowledgeIngestionService],
  exports: [KnowledgeIngestionService],
})
export class KnowledgeBaseModule {}
