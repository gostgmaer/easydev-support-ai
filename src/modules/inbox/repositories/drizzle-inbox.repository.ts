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
  lte,
  isNull,
  inArray,
} from 'drizzle-orm';
import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxFilter } from '../domain/inbox-filter.entity';
import { SavedView } from '../domain/saved-view.entity';
import { InboxAssignment } from '../domain/inbox-assignment.entity';
import { InboxPresence } from '../domain/inbox-presence.entity';
import { InboxSnooze } from '../domain/inbox-snooze.entity';
import { InboxBookmark } from '../domain/inbox-bookmark.entity';
import { ActivityFeed } from '../domain/activity-feed.entity';
import {
  IInboxRepository,
  InboxQueryOptions,
  PaginatedResult,
} from './inbox-repository.interface';
import { InboxMapper } from './inbox.mapper';

const HIGH_PRIORITIES = ['HIGH', 'URGENT'];

@Injectable()
export class DrizzleInboxRepository implements IInboxRepository {
  // ---- Projection (inbox_views) ----

  async findViewByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxView | null> {
    const [row] = await db
      .select()
      .from(schema.inboxViews)
      .where(
        and(
          eq(schema.inboxViews.tenantId, tenantId),
          eq(schema.inboxViews.conversationId, conversationId),
        ),
      );
    if (!row) return null;
    return InboxMapper.viewToDomain(row);
  }

  async saveView(view: InboxView, tenantId: string): Promise<InboxView> {
    const raw = {
      id: view.id,
      tenantId,
      conversationId: view.conversationId,
      customerId: view.customerId || null,
      channelId: view.channelId || null,
      assignedAgentId: view.assignedAgentId || null,
      assignedTeamId: view.assignedTeamId || null,
      status: view.status.value,
      priority: view.priority,
      sentiment: view.sentiment || null,
      lastMessage: view.lastMessage || null,
      lastMessageAt: view.lastMessageAt || null,
      lastMessageType: view.lastMessageType || null,
      unreadCount: view.unreadCount,
      openTicketCount: view.openTicketCount,
      aiConfidenceScore: view.aiConfidenceScore ?? null,
      waitingSince: view.waitingSince || null,
      metadata: view.metadata || null,
      updatedAt: new Date(),
    };

    await db
      .insert(schema.inboxViews)
      .values({ ...raw, createdAt: view.createdAt })
      .onConflictDoUpdate({
        target: [schema.inboxViews.tenantId, schema.inboxViews.conversationId],
        set: raw,
      });
    return view;
  }

  private async buildListConditions(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<any[] | null> {
    const conditions: any[] = [
      eq(schema.inboxViews.tenantId, tenantId),
      isNull(schema.inboxViews.deletedAt),
    ];
    if (options.status)
      conditions.push(eq(schema.inboxViews.status, options.status));
    if (options.priority)
      conditions.push(eq(schema.inboxViews.priority, options.priority));
    if (options.sentiment)
      conditions.push(eq(schema.inboxViews.sentiment, options.sentiment));
    if (options.assignedAgentId)
      conditions.push(
        eq(schema.inboxViews.assignedAgentId, options.assignedAgentId),
      );
    if (options.assignedTeamId)
      conditions.push(
        eq(schema.inboxViews.assignedTeamId, options.assignedTeamId),
      );
    if (options.customerId)
      conditions.push(eq(schema.inboxViews.customerId, options.customerId));
    if (options.channelId)
      conditions.push(eq(schema.inboxViews.channelId, options.channelId));
    if (options.unassigned)
      conditions.push(isNull(schema.inboxViews.assignedAgentId));
    if (options.highPriority)
      conditions.push(inArray(schema.inboxViews.priority, HIGH_PRIORITIES));
    if (options.aiEscalated)
      conditions.push(
        sql`${schema.inboxViews.metadata}->>'aiEscalated' = 'true'`,
      );
    if (options.slaRisk)
      conditions.push(sql`${schema.inboxViews.metadata}->>'slaRisk' = 'true'`);
    if (options.search)
      conditions.push(
        or(
          ilike(schema.inboxViews.lastMessage, `%${options.search}%`),
          ilike(schema.inboxViews.sentiment, `%${options.search}%`),
        ),
      );

    if (options.bookmarkedByUserId) {
      const bookmarks = await db
        .select({ conversationId: schema.inboxBookmarks.conversationId })
        .from(schema.inboxBookmarks)
        .where(
          and(
            eq(schema.inboxBookmarks.tenantId, tenantId),
            eq(schema.inboxBookmarks.userId, options.bookmarkedByUserId),
          ),
        );
      const ids = bookmarks.map((b) => b.conversationId);
      if (ids.length === 0) return null;
      conditions.push(inArray(schema.inboxViews.conversationId, ids));
    }

    return conditions;
  }

  async listViews(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<PaginatedResult<InboxView>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const baseConditions = await this.buildListConditions(tenantId, options);
    if (baseConditions === null) {
      return { data: [], total: 0 };
    }

    const conditions = [...baseConditions];
    if (options.cursor)
      conditions.push(gt(schema.inboxViews.id, options.cursor));

    let orderColumn: any = schema.inboxViews.lastMessageAt;
    if (options.sortBy === 'priority') orderColumn = schema.inboxViews.priority;
    else if (options.sortBy === 'waitingSince')
      orderColumn = schema.inboxViews.waitingSince;
    else if (options.sortBy === 'createdAt')
      orderColumn = schema.inboxViews.createdAt;
    const order =
      options.sortOrder === 'ASC' ? asc(orderColumn) : desc(orderColumn);

    const rows = await db
      .select()
      .from(schema.inboxViews)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit)
      .offset(options.cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.inboxViews)
      .where(and(...baseConditions));

    const data = rows.map((r) => InboxMapper.viewToDomain(r));
    const nextCursor =
      data.length === limit ? rows[rows.length - 1].id : undefined;
    return { data, total: Number(count), nextCursor };
  }

  async countByStatus(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<Record<string, number>> {
    const baseConditions = await this.buildListConditions(tenantId, options);
    if (baseConditions === null) return {};
    const rows = await db
      .select({
        status: schema.inboxViews.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(schema.inboxViews)
      .where(and(...baseConditions))
      .groupBy(schema.inboxViews.status);
    const result: Record<string, number> = {};
    for (const r of rows) result[r.status] = Number(r.count);
    return result;
  }

  // ---- Filters ----

  async saveFilter(filter: InboxFilter, tenantId: string): Promise<void> {
    const raw = {
      id: filter.id,
      tenantId,
      name: filter.name,
      filterDefinition: filter.filterDefinition,
      isSystem: filter.isSystem,
      isShared: filter.isShared,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select()
      .from(schema.inboxFilters)
      .where(
        and(
          eq(schema.inboxFilters.id, filter.id),
          eq(schema.inboxFilters.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.inboxFilters)
        .set(raw)
        .where(
          and(
            eq(schema.inboxFilters.id, filter.id),
            eq(schema.inboxFilters.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.inboxFilters)
        .values({ ...raw, createdAt: filter.createdAt });
    }
  }

  async getFilter(
    tenantId: string,
    filterId: string,
  ): Promise<InboxFilter | null> {
    const [row] = await db
      .select()
      .from(schema.inboxFilters)
      .where(
        and(
          eq(schema.inboxFilters.tenantId, tenantId),
          eq(schema.inboxFilters.id, filterId),
        ),
      );
    if (!row) return null;
    return InboxMapper.filterToDomain(row);
  }

  async listFilters(tenantId: string): Promise<InboxFilter[]> {
    const rows = await db
      .select()
      .from(schema.inboxFilters)
      .where(eq(schema.inboxFilters.tenantId, tenantId))
      .orderBy(asc(schema.inboxFilters.name));
    return rows.map((r) => InboxMapper.filterToDomain(r));
  }

  async deleteFilter(tenantId: string, filterId: string): Promise<boolean> {
    const result = await db
      .delete(schema.inboxFilters)
      .where(
        and(
          eq(schema.inboxFilters.tenantId, tenantId),
          eq(schema.inboxFilters.id, filterId),
          eq(schema.inboxFilters.isSystem, false),
        ),
      )
      .returning({ id: schema.inboxFilters.id });
    return result.length > 0;
  }

  // ---- Saved views ----

  async saveSavedView(view: SavedView, tenantId: string): Promise<void> {
    const raw = {
      id: view.id,
      tenantId,
      userId: view.userId,
      name: view.name,
      filterId: view.filterId,
      sortConfiguration: view.sortConfiguration || null,
      columnConfiguration: view.columnConfiguration || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select()
      .from(schema.inboxSavedViews)
      .where(
        and(
          eq(schema.inboxSavedViews.id, view.id),
          eq(schema.inboxSavedViews.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.inboxSavedViews)
        .set(raw)
        .where(
          and(
            eq(schema.inboxSavedViews.id, view.id),
            eq(schema.inboxSavedViews.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.inboxSavedViews)
        .values({ ...raw, createdAt: view.createdAt });
    }
  }

  async getSavedView(tenantId: string, id: string): Promise<SavedView | null> {
    const [row] = await db
      .select()
      .from(schema.inboxSavedViews)
      .where(
        and(
          eq(schema.inboxSavedViews.tenantId, tenantId),
          eq(schema.inboxSavedViews.id, id),
        ),
      );
    if (!row) return null;
    return InboxMapper.savedViewToDomain(row);
  }

  async listSavedViews(tenantId: string, userId: string): Promise<SavedView[]> {
    const rows = await db
      .select()
      .from(schema.inboxSavedViews)
      .where(
        and(
          eq(schema.inboxSavedViews.tenantId, tenantId),
          eq(schema.inboxSavedViews.userId, userId),
        ),
      )
      .orderBy(asc(schema.inboxSavedViews.name));
    return rows.map((r) => InboxMapper.savedViewToDomain(r));
  }

  async deleteSavedView(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(schema.inboxSavedViews)
      .where(
        and(
          eq(schema.inboxSavedViews.tenantId, tenantId),
          eq(schema.inboxSavedViews.id, id),
        ),
      )
      .returning({ id: schema.inboxSavedViews.id });
    return result.length > 0;
  }

  // ---- Assignments ----

  async addAssignment(
    assignment: InboxAssignment,
    tenantId: string,
  ): Promise<void> {
    await db.insert(schema.inboxAssignments).values({
      id: assignment.id,
      tenantId,
      conversationId: assignment.conversationId,
      assignedAgentId: assignment.assignedAgentId || null,
      assignedTeamId: assignment.assignedTeamId || null,
      assignmentType: assignment.assignmentType.value,
      assignedAt: assignment.assignedAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    });
  }

  async findAssignments(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxAssignment[]> {
    const rows = await db
      .select()
      .from(schema.inboxAssignments)
      .where(
        and(
          eq(schema.inboxAssignments.tenantId, tenantId),
          eq(schema.inboxAssignments.conversationId, conversationId),
        ),
      )
      .orderBy(desc(schema.inboxAssignments.assignedAt));
    return rows.map((r) => InboxMapper.assignmentToDomain(r));
  }

  // ---- Presence ----

  async upsertPresence(
    presence: InboxPresence,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: presence.id,
      tenantId,
      userId: presence.userId,
      status: presence.status.value,
      lastSeenAt: presence.lastSeenAt,
      activeConversationId: presence.activeConversationId || null,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.inboxPresence)
      .values({ ...raw, createdAt: presence.createdAt })
      .onConflictDoUpdate({
        target: [schema.inboxPresence.tenantId, schema.inboxPresence.userId],
        set: {
          status: raw.status,
          lastSeenAt: raw.lastSeenAt,
          activeConversationId: raw.activeConversationId,
          updatedAt: new Date(),
        },
      });
  }

  async getPresence(
    tenantId: string,
    userId: string,
  ): Promise<InboxPresence | null> {
    const [row] = await db
      .select()
      .from(schema.inboxPresence)
      .where(
        and(
          eq(schema.inboxPresence.tenantId, tenantId),
          eq(schema.inboxPresence.userId, userId),
        ),
      );
    if (!row) return null;
    return InboxMapper.presenceToDomain(row);
  }

  async listOnlinePresence(tenantId: string): Promise<InboxPresence[]> {
    const rows = await db
      .select()
      .from(schema.inboxPresence)
      .where(
        and(
          eq(schema.inboxPresence.tenantId, tenantId),
          inArray(schema.inboxPresence.status, ['ONLINE', 'AWAY', 'BUSY']),
        ),
      )
      .orderBy(desc(schema.inboxPresence.lastSeenAt));
    return rows.map((r) => InboxMapper.presenceToDomain(r));
  }

  // ---- Snoozes ----

  async upsertSnooze(snooze: InboxSnooze, tenantId: string): Promise<void> {
    const raw = {
      id: snooze.id,
      tenantId,
      conversationId: snooze.conversationId,
      snoozedUntil: snooze.snoozedUntil,
      reason: snooze.reason || null,
      createdBy: snooze.createdBy || null,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.inboxSnoozes)
      .values({ ...raw, createdAt: snooze.createdAt })
      .onConflictDoUpdate({
        target: [
          schema.inboxSnoozes.tenantId,
          schema.inboxSnoozes.conversationId,
        ],
        set: {
          snoozedUntil: raw.snoozedUntil,
          reason: raw.reason,
          updatedAt: new Date(),
        },
      });
  }

  async getSnooze(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxSnooze | null> {
    const [row] = await db
      .select()
      .from(schema.inboxSnoozes)
      .where(
        and(
          eq(schema.inboxSnoozes.tenantId, tenantId),
          eq(schema.inboxSnoozes.conversationId, conversationId),
        ),
      );
    if (!row) return null;
    return InboxMapper.snoozeToDomain(row);
  }

  async deleteSnooze(
    tenantId: string,
    conversationId: string,
  ): Promise<boolean> {
    const result = await db
      .delete(schema.inboxSnoozes)
      .where(
        and(
          eq(schema.inboxSnoozes.tenantId, tenantId),
          eq(schema.inboxSnoozes.conversationId, conversationId),
        ),
      )
      .returning({ id: schema.inboxSnoozes.id });
    return result.length > 0;
  }

  async findDueSnoozes(
    tenantId: string | undefined,
    now: Date,
    limit: number,
  ): Promise<InboxSnooze[]> {
    const conditions: any[] = [lte(schema.inboxSnoozes.snoozedUntil, now)];
    if (tenantId) conditions.push(eq(schema.inboxSnoozes.tenantId, tenantId));
    const rows = await db
      .select()
      .from(schema.inboxSnoozes)
      .where(and(...conditions))
      .orderBy(asc(schema.inboxSnoozes.snoozedUntil))
      .limit(limit);
    return rows.map((r) => InboxMapper.snoozeToDomain(r));
  }

  // ---- Bookmarks ----

  async addBookmark(bookmark: InboxBookmark, tenantId: string): Promise<void> {
    await db
      .insert(schema.inboxBookmarks)
      .values({
        id: bookmark.id,
        tenantId,
        conversationId: bookmark.conversationId,
        userId: bookmark.userId,
        createdAt: bookmark.createdAt,
        updatedAt: bookmark.updatedAt,
      })
      .onConflictDoNothing();
  }

  async removeBookmark(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await db
      .delete(schema.inboxBookmarks)
      .where(
        and(
          eq(schema.inboxBookmarks.tenantId, tenantId),
          eq(schema.inboxBookmarks.conversationId, conversationId),
          eq(schema.inboxBookmarks.userId, userId),
        ),
      )
      .returning({ id: schema.inboxBookmarks.id });
    return result.length > 0;
  }

  async isBookmarked(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: schema.inboxBookmarks.id })
      .from(schema.inboxBookmarks)
      .where(
        and(
          eq(schema.inboxBookmarks.tenantId, tenantId),
          eq(schema.inboxBookmarks.conversationId, conversationId),
          eq(schema.inboxBookmarks.userId, userId),
        ),
      );
    return !!row;
  }

  async listBookmarks(
    tenantId: string,
    userId: string,
  ): Promise<InboxBookmark[]> {
    const rows = await db
      .select()
      .from(schema.inboxBookmarks)
      .where(
        and(
          eq(schema.inboxBookmarks.tenantId, tenantId),
          eq(schema.inboxBookmarks.userId, userId),
        ),
      )
      .orderBy(desc(schema.inboxBookmarks.createdAt));
    return rows.map((r) => InboxMapper.bookmarkToDomain(r));
  }

  // ---- Activity feed ----

  async addActivity(activity: ActivityFeed, tenantId: string): Promise<void> {
    await db.insert(schema.inboxActivityFeed).values({
      id: activity.id,
      tenantId,
      conversationId: activity.conversationId,
      eventType: activity.eventType,
      actorId: activity.actorId || null,
      eventData: activity.eventData || null,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    });
  }

  async listActivity(
    tenantId: string,
    conversationId: string,
    limit = 50,
  ): Promise<ActivityFeed[]> {
    const rows = await db
      .select()
      .from(schema.inboxActivityFeed)
      .where(
        and(
          eq(schema.inboxActivityFeed.tenantId, tenantId),
          eq(schema.inboxActivityFeed.conversationId, conversationId),
        ),
      )
      .orderBy(desc(schema.inboxActivityFeed.createdAt))
      .limit(limit);
    return rows.map((r) => InboxMapper.activityToDomain(r));
  }
}
