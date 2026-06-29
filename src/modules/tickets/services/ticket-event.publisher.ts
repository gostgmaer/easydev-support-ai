import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

const ANALYTICS_EVENTS = new Set([
  'ticket.created',
  'ticket.updated',
  'ticket.assigned',
  'ticket.transferred',
  'ticket.commented',
  'ticket.escalated',
  'ticket.resolved',
  'ticket.closed',
  'ticket.reopened',
  'ticket.approval.requested',
  'ticket.approved',
  'ticket.rejected',
  'sla.breached',
]);

@Injectable()
export class TicketEventPublisher {
  private readonly logger = new Logger(TicketEventPublisher.name);

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
        // Strip out non-serializable stuff or just pass event.
        // It's a DomainEvent, so it should be JSON serializable.
        const { tenantId, id, ...payload } = event as any;
        await this.queueService.addJob(QUEUES.TICKET, 'ticket-analytics-job', {
          ticketId: event.getAggregateId(),
          eventName,
          payload,
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
