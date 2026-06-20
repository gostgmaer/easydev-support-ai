import { ITenantRepository } from '@easydev/shared-kernel';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationAssignment } from '../domain/conversation-assignment.entity';
import { ConversationNote } from '../domain/conversation-note.entity';
import { ConversationTag } from '../domain/conversation-tag.entity';
import { ConversationMention } from '../domain/conversation-mention.entity';
import { ConversationSummary } from '../domain/conversation-summary.entity';

export interface ConversationQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  customerId?: string;
  channelId?: string;
  search?: string;
  unassigned?: boolean;
}

export interface InboxQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  unassigned?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface IConversationRepository extends ITenantRepository<
  Conversation,
  string
> {
  findPaginated(
    tenantId: string,
    options: ConversationQueryOptions,
  ): Promise<PaginatedResult<Conversation>>;
  search(
    tenantId: string,
    query: string,
    limit?: number,
  ): Promise<Conversation[]>;

  // Assignments
  addAssignment(
    assignment: ConversationAssignment,
    tenantId: string,
  ): Promise<void>;
  findAssignments(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationAssignment[]>;

  // Tags
  findTags(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationTag[]>;
  removeTag(
    conversationId: string,
    tag: string,
    tenantId: string,
  ): Promise<void>;

  // Notes
  findNotes(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationNote[]>;

  // Mentions
  findMentions(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationMention[]>;

  // Inbox read model (conversation_summary)
  upsertSummary(summary: ConversationSummary, tenantId: string): Promise<void>;
  getSummary(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationSummary | null>;
  findInbox(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<PaginatedResult<ConversationSummary>>;
  countUnread(tenantId: string, options: InboxQueryOptions): Promise<number>;
}
