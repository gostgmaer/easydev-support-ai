import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(@InjectRepository(Ticket) private ticketRepo: Repository<Ticket>) {}

  async findAll(tenantId: string) {
    return this.ticketRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async createTicket(tenantId: string, data: Partial<Ticket>) {
    const ticket = this.ticketRepo.create({
      ...data,
      tenantId,
      status: TicketStatus.OPEN,
    });
    this.logger.log(`Creating ticket for tenant ${tenantId}`);
    return this.ticketRepo.save(ticket);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const ticketStatus = status.toUpperCase() as TicketStatus;
    await this.ticketRepo.update({ id, tenantId }, { status: ticketStatus });
    return this.ticketRepo.findOne({ where: { id, tenantId } });
  }
}
