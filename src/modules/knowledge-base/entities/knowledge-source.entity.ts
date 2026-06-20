import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('knowledge_sources')
export class KnowledgeSource extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: any;

  @Column({ type: 'varchar', length: 50, default: 'IDLE' })
  status: string;

  @Column({ type: 'timestamp', name: 'last_synced_at', nullable: true })
  lastSyncedAt: Date;
}
