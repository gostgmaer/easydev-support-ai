import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('customers')
export class Customer extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
