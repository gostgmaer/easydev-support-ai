import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_approvals')
export class WorkflowApproval extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_execution_id' })
  workflowExecutionId: string;

  @Column({ type: 'uuid', name: 'approver_id' })
  approverId: string;

  @Column({ type: 'varchar', length: 50, name: 'approval_status', default: 'PENDING' })
  approvalStatus: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'timestamp', name: 'approved_at', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at', nullable: true })
  expiresAt: Date;
}
