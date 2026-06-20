import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

const ANALYTICS_EVENTS = new Set([
  'message.created',
  'message.received',
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'message.retried',
  'message.archived',
]);

/**
 * Triggers the AI workflow platform for inbound customer traffic without ever
 * running AI logic inside the request/persistence path.
 */
const AI_TRIGGER_EVENTS = new Set(['message.received']);

@Injectable()
export class MessageEventPublisher {
  private readonly logger = new Logger(MessageEventPublisher.name);

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
        await this.queueService.addJob(
          QUEUES.MESSAGE,
          'message-analytics-job',
          {
            messageId: event.getAggregateId(),
            eventName,
          },
        );
      }

      if (AI_TRIGGER_EVENTS.has(eventName)) {
        const conversationId = (event as { conversationId?: string })
          .conversationId;
        await this.queueService.addJob(
          QUEUES.MESSAGE,
          'ai-workflow-trigger-job',
          {
            messageId: event.getAggregateId(),
            conversationId,
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
