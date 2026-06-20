import { Injectable, Logger } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { QueueService } from '@easydev/shared-queues';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SecurityEventPublisher {
  private readonly logger = new Logger(SecurityEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(tenantId: string, eventName: string, payload: any, tx?: any): Promise<void> {
    const client = tx || db;
    const eventId = uuidv4();
    
    try {
      await this.queueService.addJob('analytics-queue', eventName, {
        tenantId,
        payload,
        eventId,
      });

      await client.insert(schema.outboxEvents).values({
        id: eventId,
        tenantId,
        eventName,
        payload,
        status: 'PROCESSED',
        attempts: 1,
        processedAt: new Date(),
      });
    } catch (err: any) {
      this.logger.error(`Failed to publish security event [${eventName}]: ${err.message}`);
      try {
        await client.insert(schema.outboxEvents).values({
          id: eventId,
          tenantId,
          eventName,
          payload,
          status: 'FAILED',
          attempts: 1,
          lastError: err.message,
        });
      } catch {}
    }
  }
}
