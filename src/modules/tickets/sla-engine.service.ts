import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority } from './entities/ticket.entity';
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
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaBreaches() {
    this.logger.debug('Running SLA Breach Detection Engine...');

    const now = new Date();
    
    // Find all SLA configurations that are breached but not marked as breached
    const breachedSlas = await this.slaRepo.createQueryBuilder('sla')
      .leftJoinAndSelect('sla.ticket', 'ticket')
      .where('(sla.isResponseBreached = :breachedVal AND sla.firstRespondedAt IS NULL AND sla.firstResponseDue < :now) OR (sla.isResolutionBreached = :breachedVal AND sla.resolvedAt IS NULL AND sla.resolutionDue < :now)', { breachedVal: false, now })
      .getMany();

    if (breachedSlas.length === 0) return;

    this.logger.warn(`Found ${breachedSlas.length} SLA breaches! Executing escalation rules...`);

    for (const sla of breachedSlas) {
      if (sla.firstResponseDue < now && !sla.isResponseBreached && !sla.firstRespondedAt) {
        sla.isResponseBreached = true;
      }
      if (sla.resolutionDue < now && !sla.isResolutionBreached && !sla.resolvedAt) {
        sla.isResolutionBreached = true;
      }
      await this.slaRepo.save(sla);

      if (sla.ticket) {
        await this.escalateTicket(sla.ticket);
      }
    }
  }

  private async escalateTicket(ticket: Ticket) {
    // 1. Mark ticket priority as URGENT
    ticket.priority = TicketPriority.URGENT;
    
    // 2. Dispatch an Escalation Event (e.g., notify Manager)
    this.logger.log(`Escalating Ticket ${ticket.id} for Tenant ${ticket.tenantId}`);
    
    await this.ticketRepo.save(ticket);
  }
}
