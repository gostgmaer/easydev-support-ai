import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class WidgetEventPublisher {
  private readonly logger = new Logger(WidgetEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as { eventName?: string }).eventName ||
      event.constructor.name;
    this.logger.log(
      `Publishing Widget Event: ${eventName} for aggregate ${event.getAggregateId()}`,
    );

    try {
      // Direct integration with other modules: publish to analytics queue for tracking
      await this.queueService.addJob(QUEUES.ANALYTICS, 'widget-event-job', {
        aggregateId: event.getAggregateId(),
        eventName,
        payload: event,
      });

      // Route jobs to widget-queue based on event type
      if (
        eventName === 'widget.session.started' ||
        eventName === 'widget.session.ended'
      ) {
        await this.queueService.addJob(QUEUES.WIDGET, 'widget-session-job', {
          eventName,
          payload: event,
        });
      }

      if (eventName === 'widget.lead.created') {
        await this.queueService.addJob(QUEUES.WIDGET, 'widget-lead-job', {
          eventName,
          payload: event,
        });
      }

      if (eventName === 'widget.installed') {
        await this.queueService.addJob(
          QUEUES.WIDGET,
          'widget-installation-job',
          {
            eventName,
            payload: event,
          },
        );
      }

      // Add to analytics job
      await this.queueService.addJob(QUEUES.WIDGET, 'widget-analytics-job', {
        eventName,
        payload: event,
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to enqueue background jobs for event ${eventName}: ${err.message}`,
      );
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
