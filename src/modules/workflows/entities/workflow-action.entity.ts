import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_actions')
export class WorkflowAction extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId: string;

  @Column({ type: 'varchar', length: 50, name: 'action_type' })
  actionType: string;

  @Column({ type: 'jsonb' })
  configuration: any;

  @Column({ type: 'integer', name: 'sequence_order' })
  sequenceOrder: number;
}
