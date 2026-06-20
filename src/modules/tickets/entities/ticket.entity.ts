import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('tickets')
export class Ticket extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'uuid', name: 'conversation_id', nullable: true })
  conversationId: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string;
}
