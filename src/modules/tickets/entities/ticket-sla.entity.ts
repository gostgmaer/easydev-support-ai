import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Ticket } from './ticket.entity';

@Entity('ticket_sla')
export class TicketSla extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId: string;

  @OneToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'timestamp', name: 'first_response_due' })
  firstResponseDue: Date;

  @Column({ type: 'timestamp', name: 'resolution_due' })
  resolutionDue: Date;

  @Column({ type: 'timestamp', name: 'first_responded_at', nullable: true })
  firstRespondedAt: Date;

  @Column({ type: 'timestamp', name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'boolean', name: 'is_response_breached', default: false })
  isResponseBreached: boolean;

  @Column({ type: 'boolean', name: 'is_resolution_breached', default: false })
  isResolutionBreached: boolean;
}
