import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService } from '@easydev/shared-queues';

@Injectable()
export class TeamEventPublisher {
  private readonly logger = new Logger(TeamEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(
      `Publishing Team Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`,
    );

    try {
      if (
        eventName === 'agent.assigned' ||
        eventName === 'availability.updated'
      ) {
        await this.queueService.addJob('team-queue', 'load-balancer-job', {
          agentProfileId: event.getAggregateId(),
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to enqueue load-balancer-job: ${err.message}`);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
