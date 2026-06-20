import { Conversation } from '../domain/conversation.aggregate';
import { ConversationTag } from '../domain/conversation-tag.entity';
import { ConversationNote } from '../domain/conversation-note.entity';
import { ConversationParticipant } from '../domain/conversation-participant.entity';
import { ConversationMention } from '../domain/conversation-mention.entity';
import { ConversationAssignment } from '../domain/conversation-assignment.entity';
import { ConversationSummary } from '../domain/conversation-summary.entity';
import {
  ConversationStatus,
  ConversationStatusEnum,
  ConversationPriority,
  ConversationPriorityEnum,
  ConversationLanguage,
  ConversationSentiment,
  ConversationSentimentEnum,
  ConversationSource,
} from '../domain/value-objects';

export class ConversationMapper {
  public static tagToDomain(raw: any): ConversationTag {
    return new ConversationTag(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      tag: raw.tag,
      color: raw.color || undefined,
      isSystemTag: !!raw.isSystemTag,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static noteToDomain(raw: any): ConversationNote {
    return new ConversationNote(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      authorId: raw.authorId,
      note: raw.note,
      visibility: raw.visibility || 'INTERNAL',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static participantToDomain(raw: any): ConversationParticipant {
    return new ConversationParticipant(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      participantId: raw.participantId,
      participantType: raw.participantType,
      joinedAt: raw.joinedAt,
      leftAt: raw.leftAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static mentionToDomain(raw: any): ConversationMention {
    return new ConversationMention(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      mentionedUserId: raw.mentionedUserId,
      mentionedBy: raw.mentionedBy,
      messageReference: raw.messageReference || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static assignmentToDomain(raw: any): ConversationAssignment {
    return new ConversationAssignment(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      agentProfileId: raw.agentProfileId || undefined,
      teamId: raw.teamId || undefined,
      assignedAt: raw.assignedAt,
      assignedBy: raw.assignedBy || undefined,
      assignmentType: raw.assignmentType || 'MANUAL',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static summaryToDomain(raw: any): ConversationSummary {
    return new ConversationSummary(raw.id, {
      tenantId: raw.tenantId,
      conversationId: raw.conversationId,
      customerName: raw.customerName || undefined,
      customerAvatar: raw.customerAvatar || undefined,
      lastMessage: raw.lastMessage || undefined,
      lastMessageType: raw.lastMessageType || undefined,
      lastMessageAt: raw.lastMessageAt || undefined,
      unreadCount: raw.unreadCount ?? 0,
      totalMessages: raw.totalMessages ?? 0,
      totalAttachments: raw.totalAttachments ?? 0,
      sentimentScore: Number(raw.sentimentScore || 0),
      priority: raw.priority || undefined,
      status: raw.status || undefined,
      assignedAgentName: raw.assignedAgentName || undefined,
      assignedTeamName: raw.assignedTeamName || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toDomain(
    raw: any,
    rawTags: any[] = [],
    rawNotes: any[] = [],
    rawParticipants: any[] = [],
    rawMentions: any[] = [],
  ): Conversation {
    return new Conversation(raw.id, {
      tenantId: raw.tenantId,
      customerId: raw.customerId,
      channelId: raw.channelId || undefined,
      assignedAgentId: raw.assignedAgentId || undefined,
      assignedTeamId: raw.assignedTeamId || undefined,
      status: ConversationStatus.create(raw.status as ConversationStatusEnum),
      priority: ConversationPriority.create(raw.priority as ConversationPriorityEnum),
      subject: raw.subject || undefined,
      language: ConversationLanguage.create(raw.language || 'en'),
      sentiment: ConversationSentiment.create((raw.sentiment || 'NEUTRAL') as ConversationSentimentEnum),
      source: ConversationSource.create(raw.source || 'API'),
      lastMessageAt: raw.lastMessageAt || undefined,
      lastActivityAt: raw.lastActivityAt || undefined,
      firstResponseAt: raw.firstResponseAt || undefined,
      resolvedAt: raw.resolvedAt || undefined,
      closedAt: raw.closedAt || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: raw.version || 1,
      tags: rawTags.map((t) => ConversationMapper.tagToDomain(t)),
      notes: rawNotes.map((n) => ConversationMapper.noteToDomain(n)),
      participants: rawParticipants.map((p) => ConversationMapper.participantToDomain(p)),
      mentions: rawMentions.map((m) => ConversationMapper.mentionToDomain(m)),
    });
  }
}
