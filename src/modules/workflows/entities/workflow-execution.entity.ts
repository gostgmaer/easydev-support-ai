import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_executions')
export class WorkflowExecution extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({ type: 'varchar', length: 50, name: 'execution_status', default: 'RUNNING' })
  executionStatus: string;

  @Column({ type: 'timestamp', name: 'started_at', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ type: 'integer', name: 'execution_time_ms', default: 0 })
  executionTimeMs: number;

  @Column({ type: 'varchar', length: 50, name: 'trigger_source' })
  triggerSource: string;

  @Column({ type: 'varchar', length: 255, name: 'trigger_reference_id', nullable: true })
  triggerReferenceId: string;

  @Column({ type: 'jsonb' })
  context: any;

  @Column({ type: 'jsonb', nullable: true })
  result: any;

  @Column({ type: 'jsonb', nullable: true })
  error: any;
}
