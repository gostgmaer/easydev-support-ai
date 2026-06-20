import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, desc, ilike } from 'drizzle-orm';

@Injectable()
export class CustomerTimelineService {
  async getTimeline(tenantId: string, customerId: string) {
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.tenantId, tenantId),
          ilike(schema.auditLogs.details, `%${customerId}%`),
        ),
      )
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(50);

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      timestamp: log.createdAt,
      userId: log.userId,
    }));
  }
}
