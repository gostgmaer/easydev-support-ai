import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import {
  eq,
  and,
  or,
  ilike,
  sql,
  desc,
  asc,
  gt,
  lt,
  lte,
  isNull,
  inArray,
} from 'drizzle-orm';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketComment } from '../domain/ticket-comment.entity';
import { TicketAttachment } from '../domain/ticket-attachment.entity';
import { TicketAssignment } from '../domain/ticket-assignment.entity';
import { TicketSLA } from '../domain/ticket-sla.entity';
import { TicketApproval } from '../domain/ticket-approval.entity';
import {
  ITicketRepository,
  TicketQueryOptions,
  PaginatedResult,
} from './ticket-repository.interface';
import { TicketMapper } from './ticket.mapper';

@Injectable()
export class DrizzleTicketRepository implements ITicketRepository {
  private async loadChildren(ticketId: string, tenantId: string) {
    const [comments, tags, watchers, approvals] = await Promise.all([
      db
        .select()
        .from(schema.ticketComments)
        .where(
          and(
            eq(schema.ticketComments.ticketId, ticketId),
            eq(schema.ticketComments.tenantId, tenantId),
          ),
        )
        .orderBy(asc(schema.ticketComments.createdAt)),
      db
        .select()
        .from(schema.ticketTags)
        .where(
          and(
            eq(schema.ticketTags.ticketId, ticketId),
            eq(schema.ticketTags.tenantId, tenantId),
          ),
        ),
      db
        .select()
        .from(schema.ticketWatchers)
        .where(
          and(
            eq(schema.ticketWatchers.ticketId, ticketId),
            eq(schema.ticketWatchers.tenantId, tenantId),
          ),
        ),
      db
        .select()
        .from(schema.ticketApprovals)
        .where(
          and(
            eq(schema.ticketApprovals.ticketId, ticketId),
            eq(schema.ticketApprovals.tenantId, tenantId),
          ),
        ),
    ]);
    return { comments, tags, watchers, approvals };
  }

  async findById(id: string, tenantId: string): Promise<Ticket | null> {
    const [row] = await db
      .select()
      .from(schema.tickets)
      .where(
        and(eq(schema.tickets.id, id), eq(schema.tickets.tenantId, tenantId)),
      );
    if (!row) return null;
    const { comments, tags, watchers, approvals } = await this.loadChildren(
      id,
      tenantId,
    );
    return TicketMapper.toDomain(row, comments, tags, watchers, approvals);
  }

  async findAll(tenantId: string): Promise<Ticket[]> {
    const rows = await db
      .select()
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.tenantId, tenantId),
          isNull(schema.tickets.deletedAt),
        ),
      );
    return rows.map((r) => TicketMapper.toDomain(r));
  }

  async findByNumber(
    tenantId: string,
    ticketNumber: string,
  ): Promise<Ticket | null> {
    const [row] = await db
      .select()
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.tenantId, tenantId),
          eq(schema.tickets.ticketNumber, ticketNumber),
        ),
      );
    if (!row) return null;
    return TicketMapper.toDomain(row);
  }

  async nextSequence(tenantId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.tickets)
      .where(eq(schema.tickets.tenantId, tenantId));
    return Number(count) + 1;
  }

  async save(ticket: Ticket, tenantId: string): Promise<Ticket> {
    const raw = {
      id: ticket.id,
      tenantId: ticket.tenantId,
      ticketNumber: ticket.ticketNumber.value,
      customerId: ticket.customerId || null,
      conversationId: ticket.conversationId || null,
      assignedAgentId: ticket.assignedAgentId || null,
      assignedTeamId: ticket.assignedTeamId || null,
      categoryId: ticket.categoryId || null,
      priority: ticket.priority.value,
      status: ticket.status.value,
      source: ticket.source.value,
      subject: ticket.subject,
      description: ticket.description || null,
      resolutionSummary: ticket.resolutionSummary || null,
      openedAt: ticket.openedAt,
      firstResponseAt: ticket.firstResponseAt || null,
      resolvedAt: ticket.resolvedAt || null,
      closedAt: ticket.closedAt || null,
      metadata: ticket.metadata || null,
      deletedAt: ticket.deletedAt || null,
      version: ticket.version,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.tickets)
        .where(
          and(
            eq(schema.tickets.id, ticket.id),
            eq(schema.tickets.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.tickets)
          .set({ ...raw, updatedAt: new Date() })
          .where(
            and(
              eq(schema.tickets.id, ticket.id),
              eq(schema.tickets.tenantId, tenantId),
            ),
          );
      } else {
        await tx.insert(schema.tickets).values({
          ...raw,
          createdAt: ticket.createdAt,
          updatedAt: ticket.createdAt,
        });
      }

      for (const comment of ticket.comments) {
        await tx
          .insert(schema.ticketComments)
          .values({
            id: comment.id,
            tenantId: comment.tenantId,
            ticketId: comment.ticketId,
            authorId: comment.authorId,
            comment: comment.comment,
            visibility: comment.visibility,
            attachmentsCount: comment.attachmentsCount,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const tag of ticket.tags) {
        await tx
          .insert(schema.ticketTags)
          .values({
            id: tag.id,
            tenantId: tag.tenantId,
            ticketId: tag.ticketId,
            tag: tag.tag,
            color: tag.color || null,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const watcher of ticket.watchers) {
        await tx
          .insert(schema.ticketWatchers)
          .values({
            id: watcher.id,
            tenantId: watcher.tenantId,
            ticketId: watcher.ticketId,
            userId: watcher.userId,
            notificationPreferences: watcher.notificationPreferences || null,
            createdAt: watcher.createdAt,
            updatedAt: watcher.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const approval of ticket.approvals) {
        await tx
          .insert(schema.ticketApprovals)
          .values({
            id: approval.id,
            tenantId: approval.tenantId,
            ticketId: approval.ticketId,
            approverId: approval.approverId,
            status: approval.status,
            type: approval.type,
            comments: approval.comments || null,
            approvedAt: approval.approvedAt || null,
            createdAt: approval.createdAt,
            updatedAt: approval.updatedAt,
          })
          .onConflictDoUpdate({
            target: schema.ticketApprovals.id,
            set: {
              status: approval.status,
              comments: approval.comments || null,
              approvedAt: approval.approvedAt || null,
              updatedAt: new Date(),
            },
          });
      }
    });

    return ticket;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.tickets)
      .where(
        and(eq(schema.tickets.id, id), eq(schema.tickets.tenantId, tenantId)),
      );
    if (!existing) return false;
    await db
      .update(schema.tickets)
      .set({
        deletedAt: new Date(),
        status: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(
        and(eq(schema.tickets.id, id), eq(schema.tickets.tenantId, tenantId)),
      );
    return true;
  }

  private buildConditions(
    tenantId: string,
    options: TicketQueryOptions,
  ): any[] {
    const conditions: any[] = [
      eq(schema.tickets.tenantId, tenantId),
      isNull(schema.tickets.deletedAt),
    ];
    if (options.status)
      conditions.push(eq(schema.tickets.status, options.status));
    if (options.priority)
      conditions.push(eq(schema.tickets.priority, options.priority));
    if (options.source)
      conditions.push(eq(schema.tickets.source, options.source));
    if (options.customerId)
      conditions.push(eq(schema.tickets.customerId, options.customerId));
    if (options.categoryId)
      conditions.push(eq(schema.tickets.categoryId, options.categoryId));
    if (options.conversationId)
      conditions.push(
        eq(schema.tickets.conversationId, options.conversationId),
      );
    if (options.assignedAgentId)
      conditions.push(
        eq(schema.tickets.assignedAgentId, options.assignedAgentId),
      );
    if (options.assignedTeamId)
      conditions.push(
        eq(schema.tickets.assignedTeamId, options.assignedTeamId),
      );
    if (options.unassigned)
      conditions.push(isNull(schema.tickets.assignedAgentId));
    if (options.search)
      conditions.push(ilike(schema.tickets.subject, `%${options.search}%`));
    return conditions;
  }

  async findPaginated(
    tenantId: string,
    options: TicketQueryOptions,
  ): Promise<PaginatedResult<Ticket>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(tenantId, options);
    if (options.cursor) conditions.push(gt(schema.tickets.id, options.cursor));

    let orderByColumn: any = schema.tickets.openedAt;
    if (options.sortBy === 'priority') orderByColumn = schema.tickets.priority;
    else if (options.sortBy === 'createdAt')
      orderByColumn = schema.tickets.createdAt;
    else if (options.sortBy === 'updatedAt')
      orderByColumn = schema.tickets.updatedAt;
    const order =
      options.sortOrder === 'ASC' ? asc(orderByColumn) : desc(orderByColumn);

    const whereClause = and(...conditions);

    const rows = await db
      .select()
      .from(schema.tickets)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(options.cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.tickets)
      .where(and(...this.buildConditions(tenantId, options)));

    const data = rows.map((r) => TicketMapper.toDomain(r));
    const nextCursor =
      data.length === limit ? rows[rows.length - 1].id : undefined;

    return { data, total: Number(count), nextCursor };
  }

  async search(tenantId: string, query: string, limit = 25): Promise<Ticket[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select()
      .from(schema.tickets)
      .where(
        and(
          eq(schema.tickets.tenantId, tenantId),
          isNull(schema.tickets.deletedAt),
          or(
            ilike(schema.tickets.subject, pattern),
            ilike(schema.tickets.description, pattern),
            ilike(schema.tickets.ticketNumber, pattern),
          ),
        ),
      )
      .orderBy(desc(schema.tickets.openedAt))
      .limit(limit);
    return rows.map((r) => TicketMapper.toDomain(r));
  }

  async bulkUpdateStatus(
    tenantId: string,
    ticketIds: string[],
    status: string,
  ): Promise<number> {
    if (ticketIds.length === 0) return 0;
    const updated = await db
      .update(schema.tickets)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.tickets.tenantId, tenantId),
          inArray(schema.tickets.id, ticketIds),
        ),
      )
      .returning({ id: schema.tickets.id });
    return updated.length;
  }

  async addComment(comment: TicketComment, tenantId: string): Promise<void> {
    await db.insert(schema.ticketComments).values({
      id: comment.id,
      tenantId,
      ticketId: comment.ticketId,
      authorId: comment.authorId,
      comment: comment.comment,
      visibility: comment.visibility,
      attachmentsCount: comment.attachmentsCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  }

  async findComments(
    tenantId: string,
    ticketId: string,
    options?: { customerVisibleOnly?: boolean },
  ): Promise<TicketComment[]> {
    const conditions = [
      eq(schema.ticketComments.tenantId, tenantId),
      eq(schema.ticketComments.ticketId, ticketId),
    ];
    // No customer-facing caller exists for this yet, but the filter has to
    // live here at the data layer - relying on every future caller to
    // remember to exclude INTERNAL comments themselves is how internal notes
    // leak to customers.
    if (options?.customerVisibleOnly) {
      conditions.push(eq(schema.ticketComments.visibility, 'PUBLIC'));
    }
    const rows = await db
      .select()
      .from(schema.ticketComments)
      .where(and(...conditions))
      .orderBy(asc(schema.ticketComments.createdAt));
    return rows.map((r) => TicketMapper.commentToDomain(r));
  }

  async addAttachment(
    attachment: TicketAttachment,
    tenantId: string,
  ): Promise<void> {
    await db.insert(schema.ticketAttachments).values({
      id: attachment.id,
      tenantId,
      ticketId: attachment.ticketId,
      commentId: attachment.commentId || null,
      fileName: attachment.fileName,
      fileType: attachment.fileType || null,
      fileSize: attachment.fileSize ?? null,
      fileUrl: attachment.fileUrl || null,
      checksum: attachment.checksum || null,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    });
  }

  async findAttachments(
    tenantId: string,
    ticketId: string,
  ): Promise<TicketAttachment[]> {
    const rows = await db
      .select()
      .from(schema.ticketAttachments)
      .where(
        and(
          eq(schema.ticketAttachments.tenantId, tenantId),
          eq(schema.ticketAttachments.ticketId, ticketId),
        ),
      );
    return rows.map((r) => TicketMapper.attachmentToDomain(r));
  }

  async addAssignment(
    assignment: TicketAssignment,
    tenantId: string,
  ): Promise<void> {
    await db.insert(schema.ticketAssignments).values({
      id: assignment.id,
      tenantId,
      ticketId: assignment.ticketId,
      agentId: assignment.agentId || null,
      teamId: assignment.teamId || null,
      assignmentType: assignment.assignmentType,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy || null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    });
  }

  async findAssignments(
    tenantId: string,
    ticketId: string,
  ): Promise<TicketAssignment[]> {
    const rows = await db
      .select()
      .from(schema.ticketAssignments)
      .where(
        and(
          eq(schema.ticketAssignments.tenantId, tenantId),
          eq(schema.ticketAssignments.ticketId, ticketId),
        ),
      )
      .orderBy(desc(schema.ticketAssignments.assignedAt));
    return rows.map((r) => TicketMapper.assignmentToDomain(r));
  }

  async upsertSla(sla: TicketSLA, tenantId: string): Promise<void> {
    const raw = {
      id: sla.id,
      tenantId,
      ticketId: sla.ticketId,
      policyId: sla.policyId || null,
      responseDueAt: sla.responseDueAt || null,
      resolutionDueAt: sla.resolutionDueAt || null,
      breached: sla.breached,
      breachedAt: sla.breachedAt || null,
      remainingSeconds: sla.remainingSeconds ?? null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.ticketSla)
      .where(
        and(
          eq(schema.ticketSla.ticketId, sla.ticketId),
          eq(schema.ticketSla.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.ticketSla)
        .set(raw)
        .where(
          and(
            eq(schema.ticketSla.ticketId, sla.ticketId),
            eq(schema.ticketSla.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.ticketSla)
        .values({ ...raw, createdAt: sla.createdAt });
    }
  }

  async getSla(tenantId: string, ticketId: string): Promise<TicketSLA | null> {
    const [row] = await db
      .select()
      .from(schema.ticketSla)
      .where(
        and(
          eq(schema.ticketSla.tenantId, tenantId),
          eq(schema.ticketSla.ticketId, ticketId),
        ),
      );
    if (!row) return null;
    return TicketMapper.slaToDomain(row);
  }

  async findDueSlas(
    tenantId: string | undefined,
    now: Date,
    limit: number,
  ): Promise<TicketSLA[]> {
    const conditions: any[] = [
      eq(schema.ticketSla.breached, false),
      lte(schema.ticketSla.resolutionDueAt, now),
    ];
    if (tenantId) conditions.push(eq(schema.ticketSla.tenantId, tenantId));
    const rows = await db
      .select()
      .from(schema.ticketSla)
      .where(and(...conditions))
      .orderBy(asc(schema.ticketSla.resolutionDueAt))
      .limit(limit);
    return rows.map((r) => TicketMapper.slaToDomain(r));
  }

  async saveApproval(
    approval: TicketApproval,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: approval.id,
      tenantId,
      ticketId: approval.ticketId,
      approverId: approval.approverId,
      status: approval.status,
      type: approval.type,
      comments: approval.comments || null,
      approvedAt: approval.approvedAt || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.ticketApprovals)
      .where(
        and(
          eq(schema.ticketApprovals.id, approval.id),
          eq(schema.ticketApprovals.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.ticketApprovals)
        .set(raw)
        .where(
          and(
            eq(schema.ticketApprovals.id, approval.id),
            eq(schema.ticketApprovals.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.ticketApprovals)
        .values({ ...raw, createdAt: approval.createdAt });
    }
  }

  async getApproval(
    tenantId: string,
    approvalId: string,
  ): Promise<TicketApproval | null> {
    const [row] = await db
      .select()
      .from(schema.ticketApprovals)
      .where(
        and(
          eq(schema.ticketApprovals.tenantId, tenantId),
          eq(schema.ticketApprovals.id, approvalId),
        ),
      );
    if (!row) return null;
    return TicketMapper.approvalToDomain(row);
  }

  async findApprovals(
    tenantId: string,
    ticketId: string,
  ): Promise<TicketApproval[]> {
    const rows = await db
      .select()
      .from(schema.ticketApprovals)
      .where(
        and(
          eq(schema.ticketApprovals.tenantId, tenantId),
          eq(schema.ticketApprovals.ticketId, ticketId),
        ),
      )
      .orderBy(desc(schema.ticketApprovals.createdAt));
    return rows.map((r) => TicketMapper.approvalToDomain(r));
  }
}
