import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InboxSnoozedEvent } from '@easydev/shared-events';
import type { IInboxRepository } from '../repositories/inbox-repository.interface';
import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxSnooze } from '../domain/inbox-snooze.entity';
import { InboxEventPublisher } from './inbox-event.publisher';
import { InboxRealtimeService } from './inbox-realtime.service';
import { InboxActivityService } from './inbox-activity.service';

const SNOOZE_SWEEP_BATCH = 500;

@Injectable()
export class InboxSnoozeService {
  private readonly logger = new Logger(InboxSnoozeService.name);

  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
    private readonly eventPublisher: InboxEventPublisher,
    private readonly realtime: InboxRealtimeService,
    private readonly activityService: InboxActivityService,
  ) {}

  private async getViewOrThrow(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxView> {
    const view = await this.inboxRepo.findViewByConversation(
      tenantId,
      conversationId,
    );
    if (!view) {
      throw new NotFoundException(
        `Inbox view for conversation ${conversationId} not found`,
      );
    }
    return view;
  }

  async snooze(
    tenantId: string,
    conversationId: string,
    snoozedUntil: Date,
    reason?: string,
    userId?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    const snooze = new InboxSnooze(randomUUID(), {
      tenantId,
      conversationId,
      snoozedUntil,
      reason,
      createdBy: userId,
    });
    await this.inboxRepo.upsertSnooze(snooze, tenantId);

    view.snooze();
    await this.inboxRepo.saveView(view, tenantId);
    view.clearEvents();

    await this.eventPublisher.publish(
      new InboxSnoozedEvent(
        tenantId,
        conversationId,
        snoozedUntil.toISOString(),
      ),
    );
    await this.realtime.emitStatusChange(tenantId, {
      conversationId,
      status: 'SNOOZED',
      snoozedUntil,
    });
    await this.activityService.record(
      tenantId,
      conversationId,
      'SNOOZED',
      userId,
      { snoozedUntil: snoozedUntil.toISOString(), reason },
    );
    return snooze.toJSON();
  }

  async unsnooze(
    tenantId: string,
    conversationId: string,
    userId?: string,
  ): Promise<{ unsnoozed: boolean }> {
    const removed = await this.inboxRepo.deleteSnooze(tenantId, conversationId);
    const view = await this.inboxRepo.findViewByConversation(
      tenantId,
      conversationId,
    );
    if (view) {
      view.unsnooze();
      await this.inboxRepo.saveView(view, tenantId);
      view.clearEvents();
      await this.realtime.emitStatusChange(tenantId, {
        conversationId,
        status: view.status.value,
      });
      await this.activityService.record(
        tenantId,
        conversationId,
        'UNSNOOZED',
        userId,
      );
    }
    return { unsnoozed: removed };
  }

  /**
   * Wakes up conversations whose snooze window has elapsed. Driven by the
   * inbox-cleanup-job so the sweep stays asynchronous and lock-free.
   */
  async processDueSnoozes(
    tenantId?: string,
    now: Date = new Date(),
  ): Promise<{ woken: number }> {
    const due = await this.inboxRepo.findDueSnoozes(
      tenantId,
      now,
      SNOOZE_SWEEP_BATCH,
    );
    let woken = 0;
    for (const snooze of due) {
      await this.inboxRepo.deleteSnooze(snooze.tenantId, snooze.conversationId);
      const view = await this.inboxRepo.findViewByConversation(
        snooze.tenantId,
        snooze.conversationId,
      );
      if (view) {
        view.unsnooze();
        await this.inboxRepo.saveView(view, snooze.tenantId);
        view.clearEvents();
        await this.realtime.emitStatusChange(snooze.tenantId, {
          conversationId: snooze.conversationId,
          status: view.status.value,
        });
      }
      woken += 1;
    }
    if (woken > 0) {
      this.logger.log(`Woke ${woken} snoozed conversation(s)`);
    }
    return { woken };
  }
}
