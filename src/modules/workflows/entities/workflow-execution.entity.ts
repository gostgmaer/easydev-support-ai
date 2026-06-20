import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Workflow } from './workflow.entity';

@Entity('workflow_executions')
export class WorkflowExecution extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  context: any;

  @Column({ type: 'jsonb', nullable: true, name: 'execution_logs' })
  executionLogs: any[];

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date;
}
