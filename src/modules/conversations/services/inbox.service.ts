import { Injectable, Inject } from '@nestjs/common';
import type {
  IConversationRepository,
  InboxQueryOptions,
} from '../repositories/conversation-repository.interface';
import { RedisCacheService } from './redis-cache.service';

export interface InboxListResult {
  data: Record<string, any>[];
  total: number;
  nextCursor?: string;
}

const INBOX_TTL_SECONDS = 15;

@Injectable()
export class InboxService {
  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
    private readonly cache: RedisCacheService,
  ) {}

  private cacheKey(tenantId: string, options: InboxQueryOptions): string {
    return `inbox:${tenantId}:${JSON.stringify(options)}`;
  }

  /**
   * Inbox listing reads exclusively from the conversation_summary read model and
   * is cached in Redis (best-effort) to absorb high-frequency polling.
   */
  async listInbox(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<InboxListResult> {
    const key = this.cacheKey(tenantId, options);
    const cached = await this.cache.get<InboxListResult>(key);
    if (cached) {
      return cached;
    }

    const result = await this.conversationRepo.findInbox(tenantId, options);
    const payload: InboxListResult = {
      data: result.data.map((s) => s.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };

    await this.cache.set(key, payload, INBOX_TTL_SECONDS);
    return payload;
  }

  async myConversations(
    tenantId: string,
    agentProfileId: string,
    options: InboxQueryOptions,
  ): Promise<InboxListResult> {
    return this.listInbox(tenantId, {
      ...options,
      assignedAgentId: agentProfileId,
    });
  }

  async teamConversations(
    tenantId: string,
    teamId: string,
    options: InboxQueryOptions,
  ): Promise<InboxListResult> {
    return this.listInbox(tenantId, { ...options, assignedTeamId: teamId });
  }

  async unassigned(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<InboxListResult> {
    return this.listInbox(tenantId, { ...options, unassigned: true });
  }

  async priorityView(
    tenantId: string,
    priority: string,
    options: InboxQueryOptions,
  ): Promise<InboxListResult> {
    return this.listInbox(tenantId, { ...options, priority });
  }

  async unreadCount(
    tenantId: string,
    options: InboxQueryOptions,
  ): Promise<{ unread: number }> {
    const unread = await this.conversationRepo.countUnread(tenantId, options);
    return { unread };
  }

  async invalidate(tenantId: string): Promise<void> {
    await this.cache.invalidate(`inbox:${tenantId}:*`);
  }
}
