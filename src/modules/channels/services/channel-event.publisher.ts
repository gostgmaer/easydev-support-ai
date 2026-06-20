import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService } from '@easydev/shared-queues';

@Injectable()
export class ChannelEventPublisher {
  private readonly logger = new Logger(ChannelEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(
      `Publishing Channel Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`,
    );

    try {
      // Trigger background jobs if necessary on events
      if (eventName === 'channel.health.failed') {
        await this.queueService.addJob('channel-queue', 'channel-health-job', {
          channelId: event.getAggregateId(),
          action: 'check',
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to handle event queueing: ${err.message}`);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
