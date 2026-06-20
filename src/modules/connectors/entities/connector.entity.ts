import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('connectors')
export class Connector extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 50 })
  type: string; // e.g., 'SHOPIFY', 'SALESFORCE'

  @Column({ type: 'jsonb' })
  capabilities: string[]; // e.g., ['ORDER_TRACKING', 'REFUND_REQUEST']

  @Column({ type: 'jsonb', select: false }) // Avoid leaking credentials in SELECT *
  credentials: Record<string, any>;
}
