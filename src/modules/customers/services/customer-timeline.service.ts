import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, desc } from 'drizzle-orm';

export interface TimelineEntry {
  id: string;
  entityType: 'TICKET' | 'CONVERSATION';
  action: string;
  details: string;
  timestamp: Date;
}

@Injectable()
export class CustomerTimelineService {
  /**
   * Substring-searching audit_logs.details for the customerId (the previous
   * implementation) never actually found ticket history - ticket audit
   * entries don't embed customerId in their details string, only
   * conversation entries do. Querying tickets/conversations directly is the
   * real source of truth for "this customer's history" anyway.
   */
  async getTimeline(
    tenantId: string,
    customerId: string,
  ): Promise<TimelineEntry[]> {
    const [tickets, conversations] = await Promise.all([
      db
        .select()
        .from(schema.tickets)
        .where(
          and(
            eq(schema.tickets.tenantId, tenantId),
            eq(schema.tickets.customerId, customerId),
          ),
        )
        .orderBy(desc(schema.tickets.createdAt))
        .limit(50),
      db
        .select()
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.tenantId, tenantId),
            eq(schema.conversations.customerId, customerId),
          ),
        )
        .orderBy(desc(schema.conversations.createdAt))
        .limit(50),
    ]);

    const entries: TimelineEntry[] = [
      ...tickets.map((t) => ({
        id: t.id,
        entityType: 'TICKET' as const,
        action: `TICKET_${t.status}`,
        details: `Ticket ${t.ticketNumber}: ${t.subject}`,
        timestamp: t.createdAt,
      })),
      ...conversations.map((c) => ({
        id: c.id,
        entityType: 'CONVERSATION' as const,
        action: `CONVERSATION_${c.status}`,
        details: c.subject || `Conversation via ${c.source}`,
        timestamp: c.createdAt,
      })),
    ];

    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);
  }
}
