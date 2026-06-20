import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Customer } from './customer.entity';

@Entity('customer_segments')
export class CustomerSegment extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  rules: any;

  @ManyToMany(() => Customer)
  @JoinTable({
    name: 'customer_segment_members',
    joinColumn: { name: 'segment_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'customer_id', referencedColumnName: 'id' },
  })
  customers: Customer[];
}
