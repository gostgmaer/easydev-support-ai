import { ITenantRepository } from '@easydev/shared-kernel';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketComment } from '../domain/ticket-comment.entity';
import { TicketAttachment } from '../domain/ticket-attachment.entity';
import { TicketAssignment } from '../domain/ticket-assignment.entity';
import { TicketSLA } from '../domain/ticket-sla.entity';
import { TicketApproval } from '../domain/ticket-approval.entity';
import { TicketCategoryDefinition } from '../domain/ticket-category.entity';

export interface TicketQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  priority?: string;
  source?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  customerId?: string;
  categoryId?: string;
  conversationId?: string;
  search?: string;
  unassigned?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface ITicketRepository extends ITenantRepository<Ticket, string> {
  findByNumber(tenantId: string, ticketNumber: string): Promise<Ticket | null>;
  nextSequence(tenantId: string): Promise<number>;
  findPaginated(
    tenantId: string,
    options: TicketQueryOptions,
  ): Promise<PaginatedResult<Ticket>>;
  search(tenantId: string, query: string, limit?: number): Promise<Ticket[]>;
  bulkUpdateStatus(
    tenantId: string,
    ticketIds: string[],
    status: string,
  ): Promise<number>;

  // Comments
  addComment(comment: TicketComment, tenantId: string): Promise<void>;
  findComments(tenantId: string, ticketId: string): Promise<TicketComment[]>;

  // Attachments
  addAttachment(attachment: TicketAttachment, tenantId: string): Promise<void>;
  findAttachments(
    tenantId: string,
    ticketId: string,
  ): Promise<TicketAttachment[]>;

  // Assignments ledger
  addAssignment(assignment: TicketAssignment, tenantId: string): Promise<void>;
  findAssignments(
    tenantId: string,
    ticketId: string,
  ): Promise<TicketAssignment[]>;

  // SLA
  upsertSla(sla: TicketSLA, tenantId: string): Promise<void>;
  getSla(tenantId: string, ticketId: string): Promise<TicketSLA | null>;
  findDueSlas(
    tenantId: string | undefined,
    now: Date,
    limit: number,
  ): Promise<TicketSLA[]>;

  // Approvals
  saveApproval(approval: TicketApproval, tenantId: string): Promise<void>;
  getApproval(
    tenantId: string,
    approvalId: string,
  ): Promise<TicketApproval | null>;
  findApprovals(tenantId: string, ticketId: string): Promise<TicketApproval[]>;
}

export interface ITicketCategoryRepository
  extends ITenantRepository<TicketCategoryDefinition, string> {
  findByName(
    tenantId: string,
    name: string,
  ): Promise<TicketCategoryDefinition | null>;
  findActive(tenantId: string): Promise<TicketCategoryDefinition[]>;
}
