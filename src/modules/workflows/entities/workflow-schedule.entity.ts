import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_schedules')
export class WorkflowSchedule extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({ type: 'varchar', length: 100, name: 'cron_expression' })
  cronExpression: string;

  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone: string;

  @Column({ type: 'timestamp', name: 'next_run_at', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'timestamp', name: 'last_run_at', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
