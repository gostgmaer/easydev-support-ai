import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IInboxRepository } from '../repositories/inbox-repository.interface';
import { ActivityFeed } from '../domain/activity-feed.entity';

@Injectable()
export class InboxActivityService {
  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
  ) {}

  async record(
    tenantId: string,
    conversationId: string,
    eventType: string,
    actorId?: string,
    eventData?: Record<string, any>,
  ): Promise<ActivityFeed> {
    const activity = new ActivityFeed(randomUUID(), {
      tenantId,
      conversationId,
      eventType,
      actorId,
      eventData: eventData || {},
    });
    await this.inboxRepo.addActivity(activity, tenantId);
    return activity;
  }

  async list(
    tenantId: string,
    conversationId: string,
    limit = 50,
  ): Promise<ActivityFeed[]> {
    return this.inboxRepo.listActivity(tenantId, conversationId, limit);
  }
}
