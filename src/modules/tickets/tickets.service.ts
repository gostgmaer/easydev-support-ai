import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(@InjectRepository(Ticket) private ticketRepo: Repository<Ticket>) {}

  async findAll(tenantId: string) {
    return this.ticketRepo.find({ where: { tenant_id: tenantId }, order: { dueDate: 'ASC' } });
  }

  async createTicket(tenantId: string, data: Partial<Ticket>) {
    const ticket = this.ticketRepo.create({
      ...data,
      tenant_id: tenantId,
      status: 'Open',
    });
    this.logger.log(`Creating ticket for tenant ${tenantId}`);
    return this.ticketRepo.save(ticket);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.ticketRepo.update({ id, tenant_id: tenantId }, { status });
    return this.ticketRepo.findOne({ where: { id, tenant_id: tenantId } });
  }
}
