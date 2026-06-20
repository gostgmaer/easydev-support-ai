import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class CustomerEventPublisher {
  private readonly logger = new Logger(CustomerEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName = (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(`Publishing Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`);

    // If it's a customer event, we can run background queue jobs
    try {
      if (eventName === 'customer.created' || eventName === 'customer.updated') {
        // Trigger customer segmentation job
        await this.queueService.addJob(
          'customer-queue',
          'customer-segmentation-job',
          { customerId: event.getAggregateId() }
        );
        // Trigger customer metrics calculation job
        await this.queueService.addJob(
          'customer-queue',
          'customer-metrics-job',
          { customerId: event.getAggregateId() }
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to enqueue background jobs for event ${eventName}: ${err.message}`);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
