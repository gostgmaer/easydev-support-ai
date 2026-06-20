import { Ticket } from '../domain/ticket.aggregate';
import { TicketComment } from '../domain/ticket-comment.entity';
import { TicketAttachment } from '../domain/ticket-attachment.entity';
import { TicketAssignment } from '../domain/ticket-assignment.entity';
import { TicketSLA } from '../domain/ticket-sla.entity';
import { TicketApproval } from '../domain/ticket-approval.entity';
import { TicketTag } from '../domain/ticket-tag.entity';
import { TicketWatcher } from '../domain/ticket-watcher.entity';
import { TicketCategoryDefinition } from '../domain/ticket-category.entity';
import {
  TicketNumber,
  TicketStatus,
  TicketStatusEnum,
  TicketPriority,
  TicketPriorityEnum,
  TicketSource,
  TicketSourceEnum,
  TicketCategory,
} from '../domain/value-objects';

export class TicketMapper {
  public static commentToDomain(raw: any): TicketComment {
    return new TicketComment(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      authorId: raw.authorId,
      comment: raw.comment,
      visibility: raw.visibility || 'PUBLIC',
      attachmentsCount: raw.attachmentsCount ?? 0,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static attachmentToDomain(raw: any): TicketAttachment {
    return new TicketAttachment(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      commentId: raw.commentId || undefined,
      fileName: raw.fileName,
      fileType: raw.fileType || undefined,
      fileSize: raw.fileSize ?? undefined,
      fileUrl: raw.fileUrl || undefined,
      checksum: raw.checksum || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static assignmentToDomain(raw: any): TicketAssignment {
    return new TicketAssignment(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      agentId: raw.agentId || undefined,
      teamId: raw.teamId || undefined,
      assignmentType: raw.assignmentType || 'MANUAL',
      assignedAt: raw.assignedAt,
      assignedBy: raw.assignedBy || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static slaToDomain(raw: any): TicketSLA {
    return new TicketSLA(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      policyId: raw.policyId || undefined,
      responseDueAt: raw.responseDueAt || undefined,
      resolutionDueAt: raw.resolutionDueAt || undefined,
      breached: !!raw.breached,
      breachedAt: raw.breachedAt || undefined,
      remainingSeconds: raw.remainingSeconds ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static approvalToDomain(raw: any): TicketApproval {
    return new TicketApproval(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      approverId: raw.approverId,
      status: raw.status || 'PENDING',
      type: raw.type || 'CUSTOM',
      comments: raw.comments || undefined,
      approvedAt: raw.approvedAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static tagToDomain(raw: any): TicketTag {
    return new TicketTag(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      tag: raw.tag,
      color: raw.color || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static watcherToDomain(raw: any): TicketWatcher {
    return new TicketWatcher(raw.id, {
      tenantId: raw.tenantId,
      ticketId: raw.ticketId,
      userId: raw.userId,
      notificationPreferences:
        (raw.notificationPreferences as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static categoryToDomain(raw: any): TicketCategoryDefinition {
    return new TicketCategoryDefinition(raw.id, {
      tenantId: raw.tenantId,
      name: TicketCategory.create(raw.name),
      description: raw.description || undefined,
      color: raw.color || undefined,
      isActive: raw.isActive ?? true,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toDomain(
    raw: any,
    rawComments: any[] = [],
    rawTags: any[] = [],
    rawWatchers: any[] = [],
    rawApprovals: any[] = [],
  ): Ticket {
    return new Ticket(raw.id, {
      tenantId: raw.tenantId,
      ticketNumber: TicketNumber.create(raw.ticketNumber),
      customerId: raw.customerId || undefined,
      conversationId: raw.conversationId || undefined,
      assignedAgentId: raw.assignedAgentId || undefined,
      assignedTeamId: raw.assignedTeamId || undefined,
      categoryId: raw.categoryId || undefined,
      priority: TicketPriority.create(raw.priority as TicketPriorityEnum),
      status: TicketStatus.create(raw.status as TicketStatusEnum),
      source: TicketSource.create(raw.source as TicketSourceEnum),
      subject: raw.subject,
      description: raw.description || undefined,
      resolutionSummary: raw.resolutionSummary || undefined,
      openedAt: raw.openedAt,
      firstResponseAt: raw.firstResponseAt || undefined,
      resolvedAt: raw.resolvedAt || undefined,
      closedAt: raw.closedAt || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: raw.version || 1,
      comments: rawComments.map((c) => TicketMapper.commentToDomain(c)),
      tags: rawTags.map((t) => TicketMapper.tagToDomain(t)),
      watchers: rawWatchers.map((w) => TicketMapper.watcherToDomain(w)),
      approvals: rawApprovals.map((a) => TicketMapper.approvalToDomain(a)),
    });
  }
}
