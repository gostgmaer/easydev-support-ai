import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class ConnectorEventPublisher {
  private readonly logger = new Logger(ConnectorEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  public async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(
      `Publishing Connector Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`,
    );

    try {
      // Background synchronization or job enqueuing based on events
      if (
        eventName === 'connector.created' ||
        eventName === 'connector.updated'
      ) {
        await this.queueService.addJob(QUEUES.CONNECTOR, 'connector-sync-job', {
          connectorId: event.getAggregateId(),
          tenantId: (event as any).tenantId,
        });
      }

      // A connector exhausting its retries had no operational visibility at
      // all beyond a log line - route it through the already-built incident
      // pipeline (AdminQueueProcessor's 'admin-incident-job') so Operations
      // actually finds out. A subsequent successful call on the same
      // connector auto-resolves it.
      if (eventName === 'connector.failed') {
        const e = event as unknown as {
          tenantId: string;
          connectorId: string;
          capabilityName: string;
          reason: string;
        };
        await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
          tenantId: e.tenantId,
          affectedService: `connector:${e.connectorId}`,
          title: `Connector failed: ${e.capabilityName}`,
          severity: 'HIGH',
          description: e.reason,
        });
      }

      if (eventName === 'connector.executed') {
        const e = event as unknown as { tenantId: string; connectorId: string };
        await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
          tenantId: e.tenantId,
          affectedService: `connector:${e.connectorId}`,
          resolve: true,
        });
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to publish connector event ${eventName}: ${err.message}`,
      );
    }
  }

  public async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
