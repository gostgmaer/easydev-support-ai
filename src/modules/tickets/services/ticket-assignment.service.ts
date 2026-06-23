import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ITicketRepository } from '../repositories/ticket-repository.interface';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketAssignment } from '../domain/ticket-assignment.entity';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import { AuditService } from '../../audit/audit.service';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class TicketAssignmentService {
  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly agentAssignmentService: AgentAssignmentService,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly auditService: AuditService,
    private readonly realtime: InboxRealtimeService,
    private readonly queueService: QueueService,
  ) {}

  // NotificationQueueProcessor's 'ticket-assigned' case was fully built but
  // had no producer anywhere in the codebase - the assigned agent was never
  // actually told. Fire-and-forget: a notification failure shouldn't block
  // the assignment itself.
  private async notifyAssignedAgent(
    tenantId: string,
    agentId: string,
    ticket: Ticket,
  ): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.NOTIFICATION, 'ticket-assigned', {
        tenantId,
        agentId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber.value,
      });
    } catch {
      // notification is best-effort; assignment itself already succeeded
    }
  }

  private async persist(ticket: Ticket, tenantId: string): Promise<void> {
    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();
    await this.realtime.emitTicketUpdate(tenantId, ticket.toJSON());
  }

  private async getOrThrow(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(id, tenantId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  private async recordAssignment(
    tenantId: string,
    ticketId: string,
    agentId: string | undefined,
    teamId: string | undefined,
    assignmentType: string,
    assignedBy?: string,
  ): Promise<void> {
    await this.ticketRepo.addAssignment(
      new TicketAssignment(randomUUID(), {
        tenantId,
        ticketId,
        agentId,
        teamId,
        assignmentType,
        assignedBy,
      }),
      tenantId,
    );
  }

  async assign(
    tenantId: string,
    ticketId: string,
    agentId: string,
    teamId?: string,
    assignmentType = 'MANUAL',
    userId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, ticketId);
    ticket.assign(agentId, teamId, userId);

    await this.persist(ticket, tenantId);
    await this.recordAssignment(
      tenantId,
      ticketId,
      agentId,
      teamId,
      assignmentType,
      userId,
    );
    await this.notifyAssignedAgent(tenantId, agentId, ticket);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_ASSIGN',
      details: `Assigned ticket ${ticketId} to agent ${agentId} (${assignmentType})`,
    });
    return ticket;
  }

  /**
   * Delegates agent selection to the Team Module assignment engine
   * (round-robin / least-loaded / skill-based / priority-based / fallback).
   */
  async autoAssign(
    tenantId: string,
    ticketId: string,
    teamId: string,
    userId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, ticketId);

    const agentId = await this.agentAssignmentService.assignEntity(
      tenantId,
      teamId,
      ticketId,
      'TICKET',
      { priority: ticket.priority.weight },
    );

    return this.assign(tenantId, ticketId, agentId, teamId, 'AUTO', userId);
  }

  async transfer(
    tenantId: string,
    ticketId: string,
    toAgentId: string,
    userId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, ticketId);
    ticket.transfer(toAgentId, userId);

    await this.persist(ticket, tenantId);
    await this.recordAssignment(
      tenantId,
      ticketId,
      toAgentId,
      ticket.assignedTeamId,
      'TRANSFER',
      userId,
    );
    await this.notifyAssignedAgent(tenantId, toAgentId, ticket);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_TRANSFER',
      details: `Transferred ticket ${ticketId} to agent ${toAgentId}`,
    });
    return ticket;
  }

  async listAssignments(tenantId: string, ticketId: string) {
    return this.ticketRepo.findAssignments(tenantId, ticketId);
  }
}
