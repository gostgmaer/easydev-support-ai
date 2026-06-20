import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxFilter } from '../domain/inbox-filter.entity';
import { SavedView } from '../domain/saved-view.entity';
import { InboxAssignment } from '../domain/inbox-assignment.entity';
import { InboxPresence } from '../domain/inbox-presence.entity';
import { InboxSnooze } from '../domain/inbox-snooze.entity';
import { InboxBookmark } from '../domain/inbox-bookmark.entity';
import { ActivityFeed } from '../domain/activity-feed.entity';

export interface InboxQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  priority?: string;
  sentiment?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  customerId?: string;
  channelId?: string;
  unassigned?: boolean;
  highPriority?: boolean;
  aiEscalated?: boolean;
  slaRisk?: boolean;
  bookmarkedByUserId?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface IInboxRepository {
  // Projection (inbox_views)
  findViewByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxView | null>;
  saveView(view: InboxView, tenantId: string): Promise<InboxView>;
  listViews(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<PaginatedResult<InboxView>>;
  countByStatus(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<Record<string, number>>;

  // Filters
  saveFilter(filter: InboxFilter, tenantId: string): Promise<void>;
  getFilter(tenantId: string, filterId: string): Promise<InboxFilter | null>;
  listFilters(tenantId: string): Promise<InboxFilter[]>;
  deleteFilter(tenantId: string, filterId: string): Promise<boolean>;

  // Saved views
  saveSavedView(view: SavedView, tenantId: string): Promise<void>;
  getSavedView(tenantId: string, id: string): Promise<SavedView | null>;
  listSavedViews(tenantId: string, userId: string): Promise<SavedView[]>;
  deleteSavedView(tenantId: string, id: string): Promise<boolean>;

  // Assignments ledger
  addAssignment(assignment: InboxAssignment, tenantId: string): Promise<void>;
  findAssignments(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxAssignment[]>;

  // Presence
  upsertPresence(presence: InboxPresence, tenantId: string): Promise<void>;
  getPresence(tenantId: string, userId: string): Promise<InboxPresence | null>;
  listOnlinePresence(tenantId: string): Promise<InboxPresence[]>;

  // Snoozes
  upsertSnooze(snooze: InboxSnooze, tenantId: string): Promise<void>;
  getSnooze(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxSnooze | null>;
  deleteSnooze(tenantId: string, conversationId: string): Promise<boolean>;
  findDueSnoozes(
    tenantId: string | undefined,
    now: Date,
    limit: number,
  ): Promise<InboxSnooze[]>;

  // Bookmarks
  addBookmark(bookmark: InboxBookmark, tenantId: string): Promise<void>;
  removeBookmark(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<boolean>;
  isBookmarked(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<boolean>;
  listBookmarks(tenantId: string, userId: string): Promise<InboxBookmark[]>;

  // Activity feed
  addActivity(activity: ActivityFeed, tenantId: string): Promise<void>;
  listActivity(
    tenantId: string,
    conversationId: string,
    limit?: number,
  ): Promise<ActivityFeed[]>;
}
