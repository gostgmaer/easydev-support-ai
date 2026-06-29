import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  TicketApprovedEvent,
  TicketRejectedEvent,
} from '@easydev/shared-events';
import type { ITicketRepository } from '../repositories/ticket-repository.interface';
import { Ticket } from '../domain/ticket.aggregate';
import {
  TicketApproval,
  ApprovalTypeEnum,
} from '../domain/ticket-approval.entity';
import { TicketStatus, TicketStatusEnum } from '../domain/value-objects';
import { RequestApprovalDto, DecideApprovalDto } from '../dtos';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TicketApprovalService {
  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  private async getOrThrow(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(id, tenantId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async request(
    tenantId: string,
    ticketId: string,
    dto: RequestApprovalDto,
    userId?: string,
  ): Promise<TicketApproval> {
    const ticket = await this.getOrThrow(tenantId, ticketId);
    const approval = new TicketApproval(randomUUID(), {
      tenantId,
      ticketId,
      approverId: dto.approverId,
      status: 'PENDING',
      type: dto.type || ApprovalTypeEnum.CUSTOM,
      comments: dto.comments,
    });

    ticket.requestApproval(approval);
    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_APPROVAL_REQUEST',
      details: `Requested ${approval.type} approval ${approval.id} on ticket ${ticketId}`,
    });
    return approval;
  }

  async approve(
    tenantId: string,
    approvalId: string,
    dto: DecideApprovalDto,
    userId?: string,
  ): Promise<TicketApproval> {
    const approval = await this.getApprovalOrThrow(tenantId, approvalId);
    approval.approve(dto.comments);
    await this.ticketRepo.saveApproval(approval, tenantId);

    await this.resumeTicket(tenantId, approval.ticketId);

    await this.eventPublisher.publish(
      new TicketApprovedEvent(
        tenantId,
        approval.ticketId,
        approval.id,
        approval.approverId,
      ),
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_APPROVED',
      details: `Approved ${approval.id} on ticket ${approval.ticketId}`,
    });
    return approval;
  }

  async reject(
    tenantId: string,
    approvalId: string,
    dto: DecideApprovalDto,
    userId?: string,
  ): Promise<TicketApproval> {
    const approval = await this.getApprovalOrThrow(tenantId, approvalId);
    approval.reject(dto.comments);
    await this.ticketRepo.saveApproval(approval, tenantId);

    await this.resumeTicket(tenantId, approval.ticketId);

    await this.eventPublisher.publish(
      new TicketRejectedEvent(
        tenantId,
        approval.ticketId,
        approval.id,
        approval.approverId,
      ),
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_REJECTED',
      details: `Rejected ${approval.id} on ticket ${approval.ticketId}`,
    });
    return approval;
  }

  async cancel(
    tenantId: string,
    approvalId: string,
    userId?: string,
  ): Promise<TicketApproval> {
    const approval = await this.getApprovalOrThrow(tenantId, approvalId);
    approval.cancel();
    await this.ticketRepo.saveApproval(approval, tenantId);

    await this.resumeTicket(tenantId, approval.ticketId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TICKET_APPROVAL_CANCELLED',
      details: `Cancelled approval ${approval.id} on ticket ${approval.ticketId}`,
    });
    return approval;
  }

  async listApprovals(tenantId: string, ticketId: string) {
    return this.ticketRepo.findApprovals(tenantId, ticketId);
  }

  /**
   * Moves a ticket out of APPROVAL_PENDING once no pending approvals remain.
   */
  private async resumeTicket(
    tenantId: string,
    ticketId: string,
  ): Promise<void> {
    const ticket = await this.ticketRepo.findById(ticketId, tenantId);
    if (!ticket) return;
    if (ticket.status.value !== TicketStatusEnum.APPROVAL_PENDING) return;

    const pending = ticket.approvals.some((a) => a.isPending);
    if (pending) return;

    ticket.update({
      status: TicketStatus.create(TicketStatusEnum.IN_PROGRESS),
    });
    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();
  }

  private async getApprovalOrThrow(
    tenantId: string,
    approvalId: string,
  ): Promise<TicketApproval> {
    const approval = await this.ticketRepo.getApproval(tenantId, approvalId);
    if (!approval) {
      throw new NotFoundException(`Approval ${approvalId} not found`);
    }
    return approval;
  }
}
