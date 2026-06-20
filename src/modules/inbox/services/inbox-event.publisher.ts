import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

const ANALYTICS_EVENTS = new Set([
  'inbox.updated',
  'inbox.assignment.changed',
  'inbox.bookmarked',
  'inbox.snoozed',
  'inbox.presence.updated',
  'inbox.view.created',
]);

@Injectable()
export class InboxEventPublisher {
  private readonly logger = new Logger(InboxEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as { eventName?: string }).eventName ||
      event.constructor.name;
    this.logger.log(
      `Publishing Domain Event: ${eventName} for aggregate ${event.getAggregateId()}`,
    );
    try {
      if (ANALYTICS_EVENTS.has(eventName)) {
        await this.queueService.addJob(QUEUES.ANALYTICS, 'inbox-event', {
          aggregateId: event.getAggregateId(),
          eventName,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to enqueue background jobs for event ${eventName}: ${message}`,
      );
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
