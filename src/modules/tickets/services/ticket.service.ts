import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import type {
  ITicketRepository,
  TicketQueryOptions,
} from '../repositories/ticket-repository.interface';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketTag } from '../domain/ticket-tag.entity';
import { TicketWatcher } from '../domain/ticket-watcher.entity';
import {
  TicketNumber,
  TicketStatus,
  TicketStatusEnum,
  TicketPriority,
  TicketPriorityEnum,
  TicketSource,
  TicketSourceEnum,
} from '../domain/value-objects';
import {
  CreateTicketDto,
  UpdateTicketDto,
  TicketQueryDto,
  TagTicketDto,
  WatchTicketDto,
} from '../dtos';
import { TicketEventPublisher } from './ticket-event.publisher';
import { TicketSLAService } from './ticket-sla.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TicketService {
  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly slaService: TicketSLAService,
    private readonly customerService: CustomerService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
  ) {}

  private async persist(ticket: Ticket, tenantId: string): Promise<void> {
    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();
  }

  private async getOrThrow(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(id, tenantId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async create(
    tenantId: string,
    dto: CreateTicketDto,
    userId?: string,
  ): Promise<Ticket> {
    // Integrate with Customer Module: validate the customer when supplied.
    if (dto.customerId) {
      await this.customerService.findById(tenantId, dto.customerId);
    }

    const sequence = await this.ticketRepo.nextSequence(tenantId);
    const ticketId = randomUUID();
    const initialStatus = dto.assignedAgentId
      ? TicketStatusEnum.ASSIGNED
      : TicketStatusEnum.OPEN;

    const ticket = Ticket.create(ticketId, {
      tenantId,
      ticketNumber: TicketNumber.generate(sequence),
      customerId: dto.customerId,
      conversationId: dto.conversationId,
      assignedAgentId: dto.assignedAgentId,
      assignedTeamId: dto.assignedTeamId,
      categoryId: dto.categoryId,
      priority: TicketPriority.create(dto.priority || TicketPriorityEnum.MEDIUM),
      status: TicketStatus.create(initialStatus),
      source: TicketSource.create(dto.source || TicketSourceEnum.MANUAL),
      subject: dto.subject,
      description: dto.description,
      metadata: dto.metadata || {},
    });

    await this.persist(ticket, tenantId);
    await this.slaService.configureForTicket(tenantId, ticket);

    // Hand auto-assignment to the queue when a team is targeted without an agent.
    if (dto.assignedTeamId && !dto.assignedAgentId) {
      await this.queueService.addJob(QUEUES.TICKET, 'ticket-assignment-job', {
        ticketId,
        teamId: dto.assignedTeamId,
        userId,
      });
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CREATE',
      details: `Created ticket ${ticket.ticketNumber.value} (${ticketId})`,
    });

    return ticket;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTicketDto,
    userId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    const priorityChanged =
      dto.priority !== undefined && dto.priority !== ticket.priority.value;

    ticket.update({
      subject: dto.subject,
      description: dto.description,
      priority:
        dto.priority !== undefined
          ? TicketPriority.create(dto.priority)
          : undefined,
      status:
        dto.status !== undefined
          ? TicketStatus.create(dto.status)
          : undefined,
      categoryId: dto.categoryId,
      metadata: dto.metadata
        ? { ...(ticket.metadata || {}), ...dto.metadata }
        : undefined,
    });

    await this.persist(ticket, tenantId);

    // Reprice SLA targets when the priority changes.
    if (priorityChanged) {
      await this.slaService.configureForTicket(tenantId, ticket);
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_UPDATE',
      details: `Updated ticket ${id}`,
    });
    return ticket;
  }

  async start(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.start();
    await this.persist(ticket, tenantId);
    return ticket;
  }

  async resolve(
    tenantId: string,
    id: string,
    resolutionSummary?: string,
    userId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.resolve(resolutionSummary, userId);
    await this.persist(ticket, tenantId);
    await this.slaService.refreshRemaining(tenantId, id);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_RESOLVE',
      details: `Resolved ticket ${id}`,
    });
    return ticket;
  }

  async close(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.close(userId);
    await this.persist(ticket, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CLOSE',
      details: `Closed ticket ${id}`,
    });
    return ticket;
  }

  async reopen(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.reopen(userId);
    await this.persist(ticket, tenantId);
    await this.slaService.configureForTicket(tenantId, ticket);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_REOPEN',
      details: `Reopened ticket ${id}`,
    });
    return ticket;
  }

  async cancel(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.cancel();
    await this.persist(ticket, tenantId);
    return ticket;
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.softDelete();
    await this.ticketRepo.delete(id, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_DELETE',
      details: `Soft deleted ticket ${id}`,
    });
    return true;
  }

  async addTag(
    tenantId: string,
    id: string,
    dto: TagTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.addTag(
      new TicketTag(randomUUID(), {
        tenantId,
        ticketId: id,
        tag: dto.tag,
        color: dto.color,
      }),
    );
    await this.persist(ticket, tenantId);
    return ticket;
  }

  async removeTag(tenantId: string, id: string, tag: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.removeTag(tag);
    await this.persist(ticket, tenantId);
    return ticket;
  }

  async watch(
    tenantId: string,
    id: string,
    dto: WatchTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.addWatcher(
      new TicketWatcher(randomUUID(), {
        tenantId,
        ticketId: id,
        userId: dto.userId,
        notificationPreferences: dto.notificationPreferences || {},
      }),
    );
    await this.persist(ticket, tenantId);
    return ticket;
  }

  async unwatch(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    ticket.removeWatcher(userId);
    await this.persist(ticket, tenantId);
    return ticket;
  }

  async merge(
    tenantId: string,
    sourceId: string,
    targetId: string,
    userId?: string,
  ): Promise<Ticket> {
    const source = await this.getOrThrow(tenantId, sourceId);
    const target = await this.getOrThrow(tenantId, targetId);

    target.setMetadata({
      mergedTicketIds: [
        ...(((target.metadata || {}).mergedTicketIds as string[]) || []),
        sourceId,
      ],
    });
    source.setMetadata({ mergedInto: targetId });
    source.close(userId);

    await this.persist(target, tenantId);
    await this.persist(source, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_MERGE',
      details: `Merged ticket ${sourceId} into ${targetId}`,
    });
    return target;
  }

  async bulkUpdateStatus(
    tenantId: string,
    ticketIds: string[],
    status: TicketStatusEnum,
    userId?: string,
  ): Promise<{ updated: number }> {
    const updated = await this.ticketRepo.bulkUpdateStatus(
      tenantId,
      ticketIds,
      status,
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_BULK_UPDATE',
      details: `Bulk set status ${status} on ${updated} tickets`,
    });
    return { updated };
  }

  async findById(tenantId: string, id: string): Promise<Ticket> {
    return this.getOrThrow(tenantId, id);
  }

  async findByNumber(tenantId: string, ticketNumber: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findByNumber(tenantId, ticketNumber);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} not found`);
    }
    return ticket;
  }

  async findPaginated(tenantId: string, query: TicketQueryDto) {
    return this.ticketRepo.findPaginated(
      tenantId,
      query as TicketQueryOptions,
    );
  }
}
