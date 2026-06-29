import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { TriggerTypeEnum } from '../../workflows/domain/value-objects';
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
  InvalidTicketTransitionError,
} from '../domain/value-objects';
import {
  CreateTicketDto,
  UpdateTicketDto,
  TicketQueryDto,
  TagTicketDto,
  WatchTicketDto,
  SplitTicketDto,
} from '../dtos';
import { TicketEventPublisher } from './ticket-event.publisher';
import { TicketSLAService } from './ticket-sla.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AuditService } from '../../audit/audit.service';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly slaService: TicketSLAService,
    private readonly customerService: CustomerService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly realtime: InboxRealtimeService,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  private async evaluateWorkflowTriggers(
    tenantId: string,
    triggerType: TriggerTypeEnum,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      await this.workflowEngineService.evaluateEventTriggers(
        tenantId,
        triggerType,
        context,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to evaluate workflow triggers for ${triggerType}: ${err.message}`,
      );
    }
  }

  private async persist(ticket: Ticket, tenantId: string): Promise<void> {
    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();
    await this.realtime.emitTicketUpdate(tenantId, ticket.toJSON());
  }

  private runTransition<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof InvalidTicketTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  private async getOrThrow(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(id, tenantId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  // Best-effort customer-facing notification on a ticket lifecycle event - a
  // notification-side failure (e.g. stale customerId) must never fail the
  // lifecycle transition itself.
  private async notifyCustomer(
    tenantId: string,
    ticket: Ticket,
    jobName: string,
    extraPayload: Record<string, any> = {},
  ): Promise<void> {
    if (!ticket.customerId) return;
    try {
      const customer = await this.customerService.findById(
        tenantId,
        ticket.customerId,
      );
      if (customer?.email?.value && !customer.metadata?.syntheticEmail) {
        await this.queueService.addJob(QUEUES.NOTIFICATION, jobName, {
          tenantId,
          customerEmail: customer.email.value,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber.value,
          ...extraPayload,
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to enqueue ${jobName} notification for ticket ${ticket.id}: ${err.message}`,
      );
    }
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
      priority: TicketPriority.create(
        dto.priority || TicketPriorityEnum.MEDIUM,
      ),
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

    await this.evaluateWorkflowTriggers(
      tenantId,
      TriggerTypeEnum.TICKET_CREATED,
      {
        id: ticket.id,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber.value,
        status: ticket.status.value,
        priority: ticket.priority.value,
        customerId: ticket.customerId,
        conversationId: ticket.conversationId,
        categoryId: ticket.categoryId,
        source: ticket.source.value,
      },
    );

    await this.notifyCustomer(tenantId, ticket, 'ticket-created', {
      subject: ticket.subject,
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

    this.runTransition(() =>
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
      }),
    );

    await this.persist(ticket, tenantId);

    // Reprice SLA targets when the priority changes.
    if (priorityChanged) {
      await this.slaService.configureForTicket(tenantId, ticket);
    }

    // SLA clock management on status transitions:
    //   WAITING_CUSTOMER / APPROVAL_PENDING → pause the clock
    //   anything active (IN_PROGRESS, ASSIGNED, REOPENED) ← resume
    const SLA_PAUSE_STATUSES = new Set([
      TicketStatusEnum.WAITING_CUSTOMER,
      TicketStatusEnum.WAITING_INTERNAL,
      TicketStatusEnum.APPROVAL_PENDING,
    ]);
    const SLA_RESUME_STATUSES = new Set([
      TicketStatusEnum.IN_PROGRESS,
      TicketStatusEnum.ASSIGNED,
      TicketStatusEnum.REOPENED,
    ]);
    if (dto.status && SLA_PAUSE_STATUSES.has(dto.status as TicketStatusEnum)) {
      await this.slaService.pauseSlaForTicket(tenantId, id);
    } else if (dto.status && SLA_RESUME_STATUSES.has(dto.status as TicketStatusEnum)) {
      await this.slaService.resumeSlaForTicket(tenantId, id);
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_UPDATE',
      details: `Updated ticket ${id}`,
    });

    await this.evaluateWorkflowTriggers(
      tenantId,
      TriggerTypeEnum.TICKET_UPDATED,
      {
        id: ticket.id,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber.value,
        status: ticket.status.value,
        priority: ticket.priority.value,
        customerId: ticket.customerId,
        conversationId: ticket.conversationId,
        categoryId: ticket.categoryId,
      },
    );

    return ticket;
  }

  async start(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() => ticket.start());
    await this.persist(ticket, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_START',
      details: `Started work on ticket ${id}`,
    });
    return ticket;
  }

  /**
   * Moves a ticket to WAITING_CUSTOMER and pauses the SLA clock.
   * Called when an agent is waiting for the customer to reply before
   * progressing further.
   */
  async waitForCustomer(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() =>
      ticket.update({
        status: TicketStatus.create(TicketStatusEnum.WAITING_CUSTOMER),
      }),
    );
    await this.persist(ticket, tenantId);
    await this.slaService.pauseSlaForTicket(tenantId, id);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_WAITING_CUSTOMER',
      details: `Ticket ${id} marked as waiting for customer — SLA clock paused`,
    });
    return ticket;
  }

  /**
   * Resumes a ticket from WAITING_CUSTOMER/WAITING_INTERNAL back to IN_PROGRESS
   * and resumes the SLA clock, shifting deadlines forward by the elapsed wait.
   */
  async resumeFromWaiting(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() =>
      ticket.update({
        status: TicketStatus.create(TicketStatusEnum.IN_PROGRESS),
      }),
    );
    await this.persist(ticket, tenantId);
    await this.slaService.resumeSlaForTicket(tenantId, id);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_RESUME_FROM_WAITING',
      details: `Ticket ${id} resumed from waiting — SLA clock resumed`,
    });
    return ticket;
  }

  async resolve(
    tenantId: string,
    id: string,
    resolutionSummary?: string,
    userId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() => ticket.resolve(resolutionSummary, userId));
    await this.persist(ticket, tenantId);
    await this.slaService.refreshRemaining(tenantId, id);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_RESOLVE',
      details: `Resolved ticket ${id}`,
    });

    // NotificationQueueProcessor already had a fully-built 'ticket-resolution'
    // case (emails the customer) with no producer anywhere - customers were
    // never told their ticket was resolved.
    await this.notifyCustomer(tenantId, ticket, 'ticket-resolution', {
      summary: resolutionSummary,
    });

    return ticket;
  }

  async close(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() => ticket.close(userId));
    await this.persist(ticket, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CLOSE',
      details: `Closed ticket ${id}`,
    });
    await this.notifyCustomer(tenantId, ticket, 'ticket-closed');
    return ticket;
  }

  async reopen(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() => ticket.reopen(userId));
    await this.persist(ticket, tenantId);
    await this.slaService.configureForTicket(tenantId, ticket);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_REOPEN',
      details: `Reopened ticket ${id}`,
    });
    await this.notifyCustomer(tenantId, ticket, 'ticket-reopened');
    return ticket;
  }

  async cancel(tenantId: string, id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, id);
    this.runTransition(() => ticket.cancel());
    await this.persist(ticket, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_CANCEL',
      details: `Cancelled ticket ${id}`,
    });
    await this.notifyCustomer(tenantId, ticket, 'ticket-cancelled');
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

  async unwatch(tenantId: string, id: string, userId: string): Promise<Ticket> {
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
    if (!source.status.isTerminal()) {
      source.close(userId);
    }

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

  async split(
    tenantId: string,
    id: string,
    dto: SplitTicketDto,
    userId?: string,
  ): Promise<Ticket> {
    const parent = await this.getOrThrow(tenantId, id);

    const sequence = await this.ticketRepo.nextSequence(tenantId);
    const splitId = randomUUID();
    const splitTicket = Ticket.create(splitId, {
      tenantId,
      ticketNumber: TicketNumber.generate(sequence),
      customerId: parent.customerId,
      conversationId: randomUUID(),
      assignedAgentId: parent.assignedAgentId,
      assignedTeamId: parent.assignedTeamId,
      categoryId: parent.categoryId,
      priority: parent.priority,
      status: TicketStatus.create(TicketStatusEnum.OPEN),
      source: TicketSource.create(parent.source.value),
      subject: dto.newSubject || `Split: ${parent.subject}`,
      description: `Split off from ticket ${parent.ticketNumber.value} on message ${dto.messageId}`,
      metadata: {
        splitFromTicketId: id,
        splitFromMessageId: dto.messageId,
      },
    });

    const parentMetadata = parent.metadata || {};
    const splitTickets = (parentMetadata.splitTicketIds as string[]) || [];
    parent.setMetadata({
      ...parentMetadata,
      splitTicketIds: [...splitTickets, splitId],
    });

    await this.persist(splitTicket, tenantId);
    await this.persist(parent, tenantId);
    await this.slaService.configureForTicket(tenantId, splitTicket);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_SPLIT',
      details: `Split ticket ${splitId} from parent ticket ${id}`,
    });

    return splitTicket;
  }

  /**
   * Previously called ticketRepo.bulkUpdateStatus() directly - a raw
   * UPDATE ... WHERE id IN (...) with no state-machine check, no domain
   * events, no SLA recalculation, and no customer notification. That
   * completely bypassed canTransitionTo() (double-close, reopen-from-closed,
   * etc. were all blocked everywhere else in this codebase but wide open
   * here) and skipped every side effect resolve/close/reopen/cancel already
   * trigger. Now dispatches each ticket through the same guarded path a
   * single-ticket request would use - slower than one SQL statement, but a
   * bulk action must obey the exact same rules as doing it one at a time.
   */
  async bulkUpdateStatus(
    tenantId: string,
    ticketIds: string[],
    status: TicketStatusEnum,
    userId?: string,
  ): Promise<{
    updated: number;
    failed: number;
    errors: Record<string, string>;
  }> {
    let updatedCount = 0;
    const errors: Record<string, string> = {};

    for (const id of ticketIds) {
      try {
        switch (status) {
          case TicketStatusEnum.RESOLVED:
            await this.resolve(tenantId, id, undefined, userId);
            break;
          case TicketStatusEnum.CLOSED:
            await this.close(tenantId, id, userId);
            break;
          case TicketStatusEnum.CANCELLED:
            await this.cancel(tenantId, id, userId);
            break;
          case TicketStatusEnum.REOPENED:
            await this.reopen(tenantId, id, userId);
            break;
          default:
            await this.update(tenantId, id, { status }, userId);
        }
        updatedCount += 1;
      } catch (err: any) {
        errors[id] = err.message;
      }
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_BULK_UPDATE',
      details: `Bulk set status ${status}: ${updatedCount} succeeded, ${
        ticketIds.length - updatedCount
      } failed`,
    });

    return {
      updated: updatedCount,
      failed: ticketIds.length - updatedCount,
      errors,
    };
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
    return this.ticketRepo.findPaginated(tenantId, query);
  }
}
