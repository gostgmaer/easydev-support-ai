import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InboxPresenceUpdatedEvent } from '@easydev/shared-events';
import type { IInboxRepository } from '../repositories/inbox-repository.interface';
import { InboxPresence } from '../domain/inbox-presence.entity';
import {
  PresenceStatus,
  PresenceStatusEnum,
} from '../domain/value-objects';
import { InboxEventPublisher } from './inbox-event.publisher';
import { InboxRealtimeService } from './inbox-realtime.service';

@Injectable()
export class InboxPresenceService {
  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
    private readonly eventPublisher: InboxEventPublisher,
    private readonly realtime: InboxRealtimeService,
  ) {}

  async setPresence(
    tenantId: string,
    userId: string,
    status: PresenceStatusEnum,
    activeConversationId?: string,
  ): Promise<InboxPresence> {
    const existing = await this.inboxRepo.getPresence(tenantId, userId);
    const presence =
      existing ||
      new InboxPresence(randomUUID(), {
        tenantId,
        userId,
        status: PresenceStatus.create(status),
      });
    presence.updateStatus(status, activeConversationId);
    await this.inboxRepo.upsertPresence(presence, tenantId);

    await this.eventPublisher.publish(
      new InboxPresenceUpdatedEvent(tenantId, userId, status),
    );
    await this.realtime.emitPresenceUpdate(tenantId, presence.toJSON());
    return presence;
  }

  async heartbeat(tenantId: string, userId: string): Promise<void> {
    const existing = await this.inboxRepo.getPresence(tenantId, userId);
    const presence =
      existing ||
      new InboxPresence(randomUUID(), {
        tenantId,
        userId,
        status: PresenceStatus.create(PresenceStatusEnum.ONLINE),
      });
    presence.heartbeat();
    await this.inboxRepo.upsertPresence(presence, tenantId);
  }

  async getPresence(
    tenantId: string,
    userId: string,
  ): Promise<InboxPresence | null> {
    return this.inboxRepo.getPresence(tenantId, userId);
  }

  async listOnline(tenantId: string) {
    const presences = await this.inboxRepo.listOnlinePresence(tenantId);
    return presences.map((p) => p.toJSON());
  }
}
