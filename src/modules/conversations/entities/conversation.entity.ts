import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Customer } from '../../customers/entities/customer.entity';

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('conversations')
export class Conversation extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', name: 'channel_id', nullable: true })
  channelId: string;

  @Column({ type: 'uuid', name: 'assignee_id', nullable: true })
  assigneeId: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
  })
  status: ConversationStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  priority: string;
}
