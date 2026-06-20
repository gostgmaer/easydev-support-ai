import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

// admin.webhook.created/failed are meta-events about the delivery subsystem
// itself and are deliberately excluded to avoid delivery-failure feedback loops.
const WEBHOOK_ELIGIBLE_EVENTS = new Set([
  'admin.dashboard.updated',
  'admin.api_key.created',
  'admin.api_key.revoked',
  'admin.incident.created',
  'admin.incident.resolved',
  'system.health.changed',
  'tenant.override.created',
]);

@Injectable()
export class AdminEventPublisher {
  private readonly logger = new Logger(AdminEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as { eventName?: string }).eventName ||
      event.constructor.name;
    this.logger.log(
      `Publishing Domain Event: ${eventName} for aggregate ${event.getAggregateId()}`,
    );
    try {
      await this.queueService.addJob(QUEUES.ANALYTICS, 'admin-event', {
        aggregateId: event.getAggregateId(),
        eventName,
        payload: event,
      });

      if (WEBHOOK_ELIGIBLE_EVENTS.has(eventName)) {
        const tenantId = (event as unknown as { tenantId?: string }).tenantId;
        if (tenantId) {
          await this.queueService.addJob(QUEUES.ADMIN, 'admin-webhook-job', {
            tenantId,
            eventName,
            payload: event,
          });
        }
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
