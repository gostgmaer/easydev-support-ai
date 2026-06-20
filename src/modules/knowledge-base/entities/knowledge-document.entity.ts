import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

export enum DocumentSource {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  CSV = 'CSV',
  WEBSITE_CRAWL = 'WEBSITE_CRAWL',
}

@Entity('knowledge_documents')
export class KnowledgeDocument extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: DocumentSource,
  })
  sourceType: DocumentSource;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceUrl: string;

  @Column({ type: 'boolean', default: false })
  isIndexed: boolean; // Managed via EasyDev AI Workflow Platform
}
