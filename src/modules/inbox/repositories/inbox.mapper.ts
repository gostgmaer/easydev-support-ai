import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxFilter } from '../domain/inbox-filter.entity';
import { SavedView } from '../domain/saved-view.entity';
import { InboxAssignment } from '../domain/inbox-assignment.entity';
import { InboxPresence } from '../domain/inbox-presence.entity';
import { InboxSnooze } from '../domain/inbox-snooze.entity';
import { InboxBookmark } from '../domain/inbox-bookmark.entity';
import { ActivityFeed } from '../domain/activity-feed.entity';
import {
  InboxStatus,
  InboxStatusEnum,
  InboxPriorityEnum,
  PresenceStatus,
  PresenceStatusEnum,
  AssignmentType,
  AssignmentTypeEnum,
} from '../domain/value-objects';

export class InboxMapper {
  public static viewToDomain(raw: any): InboxView {
    return new InboxView(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      customerId: raw.customerId || undefined,
      channelId: raw.channelId || undefined,
      assignedAgentId: raw.assignedAgentId || undefined,
      assignedTeamId: raw.assignedTeamId || undefined,
      status: InboxStatus.create(raw.status as InboxStatusEnum),
      priority: (raw.priority || InboxPriorityEnum.MEDIUM) as InboxPriorityEnum,
      sentiment: raw.sentiment || undefined,
      lastMessage: raw.lastMessage || undefined,
      lastMessageAt: raw.lastMessageAt || undefined,
      lastMessageType: raw.lastMessageType || undefined,
      unreadCount: raw.unreadCount ?? 0,
      openTicketCount: raw.openTicketCount ?? 0,
      aiConfidenceScore: raw.aiConfidenceScore ?? undefined,
      waitingSince: raw.waitingSince || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: raw.version || 1,
    });
  }

  public static filterToDomain(raw: any): InboxFilter {
    return new InboxFilter(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      filterDefinition: (raw.filterDefinition as Record<string, any>) || {},
      isSystem: raw.isSystem ?? false,
      isShared: raw.isShared ?? false,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static savedViewToDomain(raw: any): SavedView {
    return new SavedView(raw.id, {
      tenantId: raw.tenantId,
      userId: raw.userId,
      name: raw.name,
      filterId: raw.filterId,
      sortConfiguration:
        (raw.sortConfiguration as Record<string, any>) || undefined,
      columnConfiguration:
        (raw.columnConfiguration as Record<string, any>) || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static assignmentToDomain(raw: any): InboxAssignment {
    return new InboxAssignment(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      assignedAgentId: raw.assignedAgentId || undefined,
      assignedTeamId: raw.assignedTeamId || undefined,
      assignmentType: AssignmentType.create(
        raw.assignmentType as AssignmentTypeEnum,
      ),
      assignedAt: raw.assignedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static presenceToDomain(raw: any): InboxPresence {
    return new InboxPresence(raw.id, {
      tenantId: raw.tenantId,
      userId: raw.userId,
      status: PresenceStatus.create(raw.status as PresenceStatusEnum),
      lastSeenAt: raw.lastSeenAt,
      activeConversationId: raw.activeConversationId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static snoozeToDomain(raw: any): InboxSnooze {
    return new InboxSnooze(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      snoozedUntil: raw.snoozedUntil,
      reason: raw.reason || undefined,
      createdBy: raw.createdBy || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static bookmarkToDomain(raw: any): InboxBookmark {
    return new InboxBookmark(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      userId: raw.userId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static activityToDomain(raw: any): ActivityFeed {
    return new ActivityFeed(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      eventType: raw.eventType,
      actorId: raw.actorId || undefined,
      eventData: (raw.eventData as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }
}
