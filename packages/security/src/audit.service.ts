import { Injectable } from '@nestjs/common';
import { db, auditLogs } from '@easydev/database';

@Injectable()
export class AuditService {
  async logEvent(
    tenantId: string,
    userId: string | null,
    action: string,
    details: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await db.insert(auditLogs).values({
      tenantId,
      userId: userId || null,
      action,
      details,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }
}
