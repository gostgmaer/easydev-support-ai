import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('workflow_versions')
export class WorkflowVersion extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'workflow_template_id' })
  workflowTemplateId: string;

  @Column({ type: 'integer', name: 'version_number' })
  versionNumber: number;

  @Column({ type: 'jsonb' })
  definition: any;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;
}
