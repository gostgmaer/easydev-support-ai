import { Injectable, Logger } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, lt, sql } from 'drizzle-orm';
import { QueueService } from '@easydev/shared-queues';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly queueService: QueueService) {}

  async storeEvent(tenantId: string, eventName: string, payload: any, tx?: any): Promise<string> {
    const eventId = uuidv4();
    const client = tx || db;

    await client.insert(schema.outboxEvents).values({
      id: eventId,
      tenantId,
      eventName,
      payload,
      status: 'PENDING',
      attempts: 0,
    });

    return eventId;
  }

  async processPendingEvents(): Promise<number> {
    // Select up to 100 pending or failed retriable events
    const pendingEvents = await db
      .select()
      .from(schema.outboxEvents)
      .where(
        and(
          sql`${schema.outboxEvents.status} IN ('PENDING', 'FAILED')`,
          lt(schema.outboxEvents.attempts, 5)
        )
      )
      .limit(100);

    let processedCount = 0;

    for (const event of pendingEvents) {
      try {
        await db
          .update(schema.outboxEvents)
          .set({ attempts: event.attempts + 1 })
          .where(eq(schema.outboxEvents.id, event.id));

        // Publish to queue corresponding to the domain / name
        // General fallback is analytics or event-sink queue
        let queueName = 'analytics-queue';
        if (event.eventName.startsWith('widget.')) {
          queueName = 'widget-queue';
        } else if (event.eventName.startsWith('conversation.')) {
          queueName = 'conversation-queue';
        } else if (event.eventName.startsWith('message.')) {
          queueName = 'message-queue';
        }

        await this.queueService.addJob(queueName as any, event.eventName, {
          tenantId: event.tenantId,
          payload: event.payload,
          outboxEventId: event.id,
        });

        await db
          .update(schema.outboxEvents)
          .set({
            status: 'PROCESSED',
            processedAt: new Date(),
          })
          .where(eq(schema.outboxEvents.id, event.id));

        processedCount++;
      } catch (err: any) {
        this.logger.error(`Failed to publish outbox event ${event.id}: ${err.message}`);
        await db
          .update(schema.outboxEvents)
          .set({
            status: 'FAILED',
            lastError: err.message,
          })
          .where(eq(schema.outboxEvents.id, event.id));
      }
    }

    return processedCount;
  }

  async replayFailedEvents(tenantId: string): Promise<number> {
    const failedEvents = await db
      .select()
      .from(schema.outboxEvents)
      .where(
        and(
          eq(schema.outboxEvents.tenantId, tenantId),
          eq(schema.outboxEvents.status, 'FAILED')
        )
      );

    for (const event of failedEvents) {
      await db
        .update(schema.outboxEvents)
        .set({
          status: 'PENDING',
          attempts: 0,
          lastError: null,
        })
        .where(eq(schema.outboxEvents.id, event.id));
    }

    return failedEvents.length;
  }

  async cleanupProcessedEvents(retentionDays: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await db
      .delete(schema.outboxEvents)
      .where(
        and(
          eq(schema.outboxEvents.status, 'PROCESSED'),
          lt(schema.outboxEvents.processedAt, cutoff)
        )
      );

    return result ? 1 : 0;
  }
}
