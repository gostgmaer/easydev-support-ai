import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('ai_workflow_executions')
export class AiWorkflowExecution extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 255 })
  workflowId: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'integer', default: 0 })
  executionTimeMs: number;

  @Column({ type: 'integer', default: 0 })
  tokensUsed: number;

  @Column({ type: 'double precision', default: 0.0 })
  estimatedCost: number;
}
