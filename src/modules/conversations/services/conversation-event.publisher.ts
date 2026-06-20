import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

const SUMMARY_TRIGGER_EVENTS = new Set([
  'conversation.created',
  'conversation.updated',
  'conversation.assigned',
  'conversation.transferred',
  'conversation.resolved',
  'conversation.closed',
  'conversation.archived',
]);

@Injectable()
export class ConversationEventPublisher {
  private readonly logger = new Logger(ConversationEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as { eventName?: string }).eventName ||
      event.constructor.name;
    this.logger.log(
      `Publishing Domain Event: ${eventName} for aggregate ${event.getAggregateId()}`,
    );

    try {
      if (SUMMARY_TRIGGER_EVENTS.has(eventName)) {
        await this.queueService.addJob(
          QUEUES.CONVERSATION,
          'conversation-summary-job',
          {
            conversationId: event.getAggregateId(),
          },
        );
        await this.queueService.addJob(
          QUEUES.CONVERSATION,
          'conversation-analytics-job',
          {
            conversationId: event.getAggregateId(),
            eventName,
          },
        );
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
