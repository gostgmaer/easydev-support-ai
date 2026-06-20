import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Ticket } from './ticket.entity';

@Entity('ticket_comments')
export class TicketComment extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', name: 'is_internal', default: false })
  isInternal: boolean;
}
