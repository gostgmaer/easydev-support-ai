import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_audit_logs')
export class WorkflowAuditLog extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_id', nullable: true })
  workflowId: string;

  @Column({ type: 'uuid', name: 'workflow_execution_id', nullable: true })
  workflowExecutionId: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
