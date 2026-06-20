import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_triggers')
export class WorkflowTrigger extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({ type: 'varchar', length: 50, name: 'trigger_type' })
  triggerType: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: any;
}
