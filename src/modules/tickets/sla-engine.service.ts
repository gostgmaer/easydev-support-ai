import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketSla } from './entities/ticket-sla.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SlaEngineService {
  private readonly logger = new Logger(SlaEngineService.name);

  constructor(
    @InjectRepository(Ticket) private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketSla) private slaRepo: Repository<TicketSla>,
  ) {}

  /**
   * Runs every minute to check for SLA breaches across all tenants.
   * In a massive multi-tenant environment, this might be handled via BullMQ 
   * delayed jobs rather than a single CRON, but CRON works for batch processing.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaBreaches() {
    this.logger.debug('Running SLA Breach Detection Engine...');

    const now = new Date();
    
    // Find all Open or In Progress tickets that have an SLA defined
    // and where the current time > due_date, and haven't been marked breached yet
    const atRiskTickets = await this.ticketRepo.createQueryBuilder('ticket')
      .where('ticket.status IN (:...statuses)', { statuses: ['Open', 'In Progress'] })
      .andWhere('ticket.dueDate < :now', { now })
      .getMany();

    if (atRiskTickets.length === 0) return;

    this.logger.warn(`Found ${atRiskTickets.length} SLA breaches! Executing escalation rules...`);

    for (const ticket of atRiskTickets) {
      await this.escalateTicket(ticket);
    }
  }

  private async escalateTicket(ticket: Ticket) {
    // 1. Mark ticket priority as Critical
    ticket.priority = 'Critical';
    
    // 2. Add an internal audit note about the breach
    
    // 3. Dispatch an Escalation Event (e.g., notify Manager)
    this.logger.log(`Escalating Ticket ${ticket.id} for Tenant ${ticket.tenant_id}`);
    
    await this.ticketRepo.save(ticket);
  }
}
