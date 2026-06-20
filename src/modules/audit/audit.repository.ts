import { Injectable } from '@nestjs/common';
import { db, auditLogs } from '@easydev/database';

@Injectable()
export class AuditRepository {
  async save(log: {
    tenantId: string;
    userId?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdBy: log.createdBy,
      updatedBy: log.updatedBy,
    });
  }
}
