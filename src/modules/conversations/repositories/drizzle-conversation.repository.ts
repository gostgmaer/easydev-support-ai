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
  isNull,
  isNotNull,
} from 'drizzle-orm';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationAssignment } from '../domain/conversation-assignment.entity';
import { ConversationNote } from '../domain/conversation-note.entity';
import { ConversationTag } from '../domain/conversation-tag.entity';
import { ConversationMention } from '../domain/conversation-mention.entity';
import { ConversationSummary } from '../domain/conversation-summary.entity';
import {
  IConversationRepository,
  ConversationQueryOptions,
  InboxQueryOptions,
  PaginatedResult,
} from './conversation-repository.interface';
import { ConversationMapper } from './conversation.mapper';

@Injectable()
export class DrizzleConversationRepository implements IConversationRepository {
  private async loadChildren(conversationId: string, tenantId: string) {
    const [tags, notes, participants, mentions] = await Promise.all([
      db
        .select()
        .from(schema.conversationTags)
        .where(
          and(
            eq(schema.conversationTags.conversationId, conversationId),
            eq(schema.conversationTags.tenantId, tenantId),
          ),
        ),
      db
        .select()
        .from(schema.conversationNotes)
        .where(
          and(
            eq(schema.conversationNotes.conversationId, conversationId),
            eq(schema.conversationNotes.tenantId, tenantId),
          ),
        ),
      db
        .select()
        .from(schema.conversationParticipants)
        .where(
          and(
            eq(schema.conversationParticipants.conversationId, conversationId),
            eq(schema.conversationParticipants.tenantId, tenantId),
          ),
        ),
      db
        .select()
        .from(schema.conversationMentions)
        .where(
          and(
            eq(schema.conversationMentions.conversationId, conversationId),
            eq(schema.conversationMentions.tenantId, tenantId),
          ),
        ),
    ]);
    return { tags, notes, participants, mentions };
  }

  async findById(id: string, tenantId: string): Promise<Conversation | null> {
    const [row] = await db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.id, id),
          eq(schema.conversations.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    const { tags, notes, participants, mentions } = await this.loadChildren(
      id,
      tenantId,
    );
    return ConversationMapper.toDomain(
      row,
      tags,
      notes,
      participants,
      mentions,
    );
  }

  async findAll(tenantId: string): Promise<Conversation[]> {
    const rows = await db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.tenantId, tenantId),
          isNull(schema.conversations.deletedAt),
        ),
      );
    return rows.map((r) => ConversationMapper.toDomain(r));
  }

  async save(
    conversation: Conversation,
    tenantId: string,
  ): Promise<Conversation> {
    const raw = {
      id: conversation.id,
      tenantId: conversation.tenantId,
      customerId: conversation.customerId,
      channelId: conversation.channelId || null,
      assignedAgentId: conversation.assignedAgentId || null,
      assignedTeamId: conversation.assignedTeamId || null,
      status: conversation.status.value,
      priority: conversation.priority.value,
      subject: conversation.subject || null,
      language: conversation.language.value,
      sentiment: conversation.sentiment.value,
      source: conversation.source.value,
      lastMessageAt: conversation.lastMessageAt || null,
      lastActivityAt: conversation.lastActivityAt || null,
      firstResponseAt: conversation.firstResponseAt || null,
      resolvedAt: conversation.resolvedAt || null,
      closedAt: conversation.closedAt || null,
      metadata: conversation.metadata || null,
      deletedAt: conversation.deletedAt || null,
      version: conversation.version,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.id, conversation.id),
            eq(schema.conversations.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.conversations)
          .set({ ...raw, updatedAt: new Date() })
          .where(
            and(
              eq(schema.conversations.id, conversation.id),
              eq(schema.conversations.tenantId, tenantId),
            ),
          );
      } else {
        await tx
          .insert(schema.conversations)
          .values({
            ...raw,
            createdAt: conversation.createdAt,
            updatedAt: conversation.createdAt,
          });
      }

      for (const tag of conversation.tags) {
        await tx
          .insert(schema.conversationTags)
          .values({
            id: tag.id,
            tenantId: tag.tenantId,
            conversationId: tag.conversationId,
            tag: tag.tag,
            color: tag.color || null,
            isSystemTag: tag.isSystemTag,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const note of conversation.notes) {
        await tx
          .insert(schema.conversationNotes)
          .values({
            id: note.id,
            tenantId: note.tenantId,
            conversationId: note.conversationId,
            authorId: note.authorId,
            note: note.note,
            visibility: note.visibility,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const participant of conversation.participants) {
        await tx
          .insert(schema.conversationParticipants)
          .values({
            id: participant.id,
            tenantId: participant.tenantId,
            conversationId: participant.conversationId,
            participantId: participant.participantId,
            participantType: participant.participantType,
            joinedAt: participant.joinedAt,
            leftAt: participant.leftAt || null,
            createdAt: participant.createdAt,
            updatedAt: participant.updatedAt,
          })
          .onConflictDoNothing();
      }

      for (const mention of conversation.mentions) {
        await tx
          .insert(schema.conversationMentions)
          .values({
            id: mention.id,
            tenantId: mention.tenantId,
            conversationId: mention.conversationId,
            mentionedUserId: mention.mentionedUserId,
            mentionedBy: mention.mentionedBy,
            messageReference: mention.messageReference || null,
            createdAt: mention.createdAt,
            updatedAt: mention.updatedAt,
          })
          .onConflictDoNothing();
      }
    });

    return conversation;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.id, id),
          eq(schema.conversations.tenantId, tenantId),
        ),
      );
    if (!existing) return false;

    await db
      .update(schema.conversations)
      .set({ deletedAt: new Date(), status: 'ARCHIVED', updatedAt: new Date() })
      .where(
        and(
          eq(schema.conversations.id, id),
          eq(schema.conversations.tenantId, tenantId),
        ),
      );
    return true;
  }

  async findPaginated(
    tenantId: string,
    options: ConversationQueryOptions,
  ): Promise<PaginatedResult<Conversation>> {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.conversations.tenantId, tenantId),
      isNull(schema.conversations.deletedAt),
    ];

    if (options.status)
      conditions.push(eq(schema.conversations.status, options.status));
    if (options.priority)
      conditions.push(eq(schema.conversations.priority, options.priority));
    if (options.customerId)
      conditions.push(eq(schema.conversations.customerId, options.customerId));
    if (options.channelId)
      conditions.push(eq(schema.conversations.channelId, options.channelId));
    if (options.assignedAgentId)
      conditions.push(
        eq(schema.conversations.assignedAgentId, options.assignedAgentId),
      );
    if (options.assignedTeamId)
      conditions.push(
        eq(schema.conversations.assignedTeamId, options.assignedTeamId),
      );
    if (options.unassigned)
      conditions.push(isNull(schema.conversations.assignedAgentId));
    if (options.search)
      conditions.push(
        ilike(schema.conversations.subject, `%${options.search}%`),
      );
    if (options.cursor)
      conditions.push(gt(schema.conversations.id, options.cursor));

    let orderByColumn: any = schema.conversations.lastActivityAt;
    if (options.sortBy === 'priority')
      orderByColumn = schema.conversations.priority;
    else if (options.sortBy === 'createdAt')
      orderByColumn = schema.conversations.createdAt;
    else if (options.sortBy === 'lastMessageAt')
      orderByColumn = schema.conversations.lastMessageAt;
    const order =
      options.sortOrder === 'ASC' ? asc(orderByColumn) : desc(orderByColumn);

    const whereClause = and(...conditions);

    const rows = await db
      .select()
      .from(schema.conversations)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(options.cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.conversations)
      .where(whereClause);

    const data = rows.map((r) => ConversationMapper.toDomain(r));
    const nextCursor =
      data.length === limit ? rows[rows.length - 1].id : undefined;

    return { data, total: Number(count), nextCursor };
  }

  async search(
    tenantId: string,
    query: string,
    limit = 20,
  ): Promise<Conversation[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.tenantId, tenantId),
          isNull(schema.conversations.deletedAt),
          or(
            ilike(schema.conversations.subject, pattern),
            ilike(schema.conversations.source, pattern),
          ),
        ),
      )
      .limit(limit);
    return rows.map((r) => ConversationMapper.toDomain(r));
  }

  async addAssignment(
    assignment: ConversationAssignment,
    tenantId: string,
  ): Promise<void> {
    await db.insert(schema.conversationAssignments).values({
      id: assignment.id,
      tenantId,
      conversationId: assignment.conversationId,
      agentProfileId: assignment.agentProfileId || null,
      teamId: assignment.teamId || null,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy || null,
      assignmentType: assignment.assignmentType,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    });
  }

  async findAssignments(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationAssignment[]> {
    const rows = await db
      .select()
      .from(schema.conversationAssignments)
      .where(
        and(
          eq(schema.conversationAssignments.conversationId, conversationId),
          eq(schema.conversationAssignments.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.conversationAssignments.assignedAt));
    return rows.map((r) => ConversationMapper.assignmentToDomain(r));
  }

  async findTags(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationTag[]> {
    const rows = await db
      .select()
      .from(schema.conversationTags)
      .where(
        and(
          eq(schema.conversationTags.conversationId, conversationId),
          eq(schema.conversationTags.tenantId, tenantId),
        ),
      );
    return rows.map((r) => ConversationMapper.tagToDomain(r));
  }

  async removeTag(
    conversationId: string,
    tag: string,
    tenantId: string,
  ): Promise<void> {
    await db
      .delete(schema.conversationTags)
      .where(
        and(
          eq(schema.conversationTags.conversationId, conversationId),
          eq(schema.conversationTags.tag, tag),
          eq(schema.conversationTags.tenantId, tenantId),
        ),
      );
  }

  async findNotes(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationNote[]> {
    const rows = await db
      .select()
      .from(schema.conversationNotes)
      .where(
        and(
          eq(schema.conversationNotes.conversationId, conversationId),
          eq(schema.conversationNotes.tenantId, tenantId),
        ),
      )
      .orderBy(desc(schema.conversationNotes.createdAt));
    return rows.map((r) => ConversationMapper.noteToDomain(r));
  }

  async findMentions(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationMention[]> {
    const rows = await db
      .select()
      .from(schema.conversationMentions)
      .where(
        and(
          eq(schema.conversationMentions.conversationId, conversationId),
          eq(schema.conversationMentions.tenantId, tenantId),
        ),
      );
    return rows.map((r) => ConversationMapper.mentionToDomain(r));
  }

  async upsertSummary(
    summary: ConversationSummary,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: summary.id,
      tenantId,
      conversationId: summary.conversationId,
      customerName: summary.customerName || null,
      customerAvatar: summary.customerAvatar || null,
      lastMessage: summary.lastMessage || null,
      lastMessageType: summary.lastMessageType || null,
      lastMessageAt: summary.lastMessageAt || null,
      unreadCount: summary.unreadCount,
      totalMessages: summary.totalMessages,
      totalAttachments: summary.totalAttachments,
      sentimentScore: summary.sentimentScore,
      priority: summary.priority || null,
      status: summary.status || null,
      assignedAgentName: summary.assignedAgentName || null,
      assignedTeamName: summary.assignedTeamName || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.conversationSummary)
      .where(
        and(
          eq(schema.conversationSummary.conversationId, summary.conversationId),
          eq(schema.conversationSummary.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.conversationSummary)
        .set(raw)
        .where(
          and(
            eq(
              schema.conversationSummary.conversationId,
              summary.conversationId,
            ),
            eq(schema.conversationSummary.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.conversationSummary)
        .values({ ...raw, createdAt: summary.createdAt });
    }
  }

  async getSummary(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationSummary | null> {
    const [row] = await db
      .select()
      .from(schema.conversationSummary)
      .where(
        and(
          eq(schema.conversationSummary.conversationId, conversationId),
          eq(schema.conversationSummary.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return ConversationMapper.summaryToDomain(row);
  }

  private buildInboxConditions(
    tenantId: string,
    options: InboxQueryOptions,
  ): any[] {
    const conditions: any[] = [
      eq(schema.conversationSummary.tenantId, tenantId),
    ];
    if (options.status)
      conditions.push(eq(schema.conversationSummary.status, options.status));
    if (options.priority)
      conditions.push(
        eq(schema.conversationSummary.priority, options.priority),
      );
    if (options.assignedAgentId) {
      conditions.push(
        sql`${schema.conversationSummary.conversationId} IN (SELECT ${schema.conversations.id} FROM ${schema.conversations} WHERE ${schema.conversations.assignedAgentId} = ${options.assignedAgentId} AND ${schema.conversations.tenantId} = ${tenantId})`,
      );
    }
    if (options.assignedTeamId) {
      conditions.push(
        sql`${schema.conversationSummary.conversationId} IN (SELECT ${schema.conversations.id} FROM ${schema.conversations} WHERE ${schema.conversations.assignedTeamId} = ${options.assignedTeamId} AND ${schema.conversations.tenantId} = ${tenantId})`,
      );
    }
    if (options.unassigned) {
      conditions.push(
        sql`${schema.conversationSummary.conversationId} IN (SELECT ${schema.conversations.id} FROM ${schema.conversations} WHERE ${schema.conversations.assignedAgentId} IS NULL AND ${schema.conversations.tenantId} = ${tenantId})`,
      );
    }
    return conditions;
  }

  async findInbox(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<PaginatedResult<ConversationSummary>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions = this.buildInboxConditions(tenantId, options);
    if (options.cursor)
      conditions.push(
        lt(schema.conversationSummary.lastMessageAt, new Date(options.cursor)),
      );

    const whereClause = and(...conditions);
    const order =
      options.sortOrder === 'ASC'
        ? asc(schema.conversationSummary.lastMessageAt)
        : desc(schema.conversationSummary.lastMessageAt);

    const rows = await db
      .select()
      .from(schema.conversationSummary)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(options.cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.conversationSummary)
      .where(and(...this.buildInboxConditions(tenantId, options)));

    const data = rows.map((r) => ConversationMapper.summaryToDomain(r));
    const last = rows[rows.length - 1];
    const nextCursor =
      data.length === limit && last.lastMessageAt
        ? new Date(last.lastMessageAt).toISOString()
        : undefined;

    return { data, total: Number(count), nextCursor };
  }

  async countUnread(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<number> {
    const conditions = this.buildInboxConditions(tenantId, options);
    conditions.push(gt(schema.conversationSummary.unreadCount, 0));
    const [{ total }] = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${schema.conversationSummary.unreadCount}), 0) as int)`,
      })
      .from(schema.conversationSummary)
      .where(and(...conditions));
    return Number(total);
  }
}
