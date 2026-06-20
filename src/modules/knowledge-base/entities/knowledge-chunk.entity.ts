import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { KnowledgeDocument } from './knowledge-document.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunk extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  @ManyToOne(() => KnowledgeDocument)
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocument;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', name: 'chunk_index' })
  chunkIndex: number;

  @Column({ type: 'varchar', length: 255, name: 'vector_id', nullable: true })
  vectorId: string;
}
