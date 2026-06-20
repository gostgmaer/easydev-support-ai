import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_conditions')
export class WorkflowCondition extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({ type: 'uuid', name: 'trigger_id', nullable: true })
  triggerId: string;

  @Column({ type: 'varchar', length: 255 })
  field: string;

  @Column({ type: 'varchar', length: 50 })
  operator: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;
}
