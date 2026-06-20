import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InboxBookmarkedEvent } from '@easydev/shared-events';
import type { IInboxRepository } from '../repositories/inbox-repository.interface';
import { InboxBookmark } from '../domain/inbox-bookmark.entity';
import { InboxEventPublisher } from './inbox-event.publisher';
import { InboxActivityService } from './inbox-activity.service';

@Injectable()
export class InboxBookmarkService {
  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
    private readonly eventPublisher: InboxEventPublisher,
    private readonly activityService: InboxActivityService,
  ) {}

  async bookmark(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<{ bookmarked: boolean }> {
    const bookmark = new InboxBookmark(randomUUID(), {
      tenantId,
      conversationId,
      userId,
    });
    await this.inboxRepo.addBookmark(bookmark, tenantId);
    await this.eventPublisher.publish(
      new InboxBookmarkedEvent(tenantId, conversationId, userId, true),
    );
    await this.activityService.record(
      tenantId,
      conversationId,
      'BOOKMARKED',
      userId,
    );
    return { bookmarked: true };
  }

  async removeBookmark(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<{ bookmarked: boolean }> {
    await this.inboxRepo.removeBookmark(tenantId, conversationId, userId);
    await this.eventPublisher.publish(
      new InboxBookmarkedEvent(tenantId, conversationId, userId, false),
    );
    return { bookmarked: false };
  }

  async list(tenantId: string, userId: string) {
    const bookmarks = await this.inboxRepo.listBookmarks(tenantId, userId);
    return bookmarks.map((b) => b.toJSON());
  }

  async isBookmarked(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<{ bookmarked: boolean }> {
    const bookmarked = await this.inboxRepo.isBookmarked(
      tenantId,
      conversationId,
      userId,
    );
    return { bookmarked };
  }
}
