import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class KnowledgeEventPublisher {
  private readonly logger = new Logger(KnowledgeEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  public async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(
      `Publishing Knowledge Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`,
    );

    try {
      // Ingestion trigger
      if (eventName === 'knowledge.document.created') {
        const docEvent = event as any;
        await this.queueService.addJob(
          QUEUES.KNOWLEDGE,
          'knowledge-ingestion-job',
          {
            tenantId: docEvent.tenantId,
            documentId: docEvent.documentId,
          },
        );
      }

      // Sync jobs
      if (eventName === 'knowledge.sync.started') {
        const syncEvent = event as any;
        await this.queueService.addJob(QUEUES.KNOWLEDGE, 'knowledge-sync-job', {
          tenantId: syncEvent.tenantId,
          sourceId: syncEvent.sourceId,
          jobId: syncEvent.jobId,
        });
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to publish knowledge event ${eventName}: ${err.message}`,
      );
    }
  }

  public async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
