import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('ai_agents')
export class AiAgent extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  agentType: string;

  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  defaultWorkflow: string;

  @Column({ type: 'text', nullable: true })
  systemPromptReference: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any>;
}
