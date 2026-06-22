import { Injectable } from '@nestjs/common';
import { db, auditLogs } from '@easydev/database';
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';

export interface AuditLogQueryOptions {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

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

  async findPaginated(
    tenantId: string,
    options: AuditLogQueryOptions = {},
  ): Promise<{ data: AuditLogRecord[]; total: number }> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions = [eq(auditLogs.tenantId, tenantId)];
    if (options.action) conditions.push(eq(auditLogs.action, options.action));
    if (options.userId) conditions.push(eq(auditLogs.userId, options.userId));
    if (options.startDate)
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    if (options.endDate)
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    if (options.search)
      conditions.push(ilike(auditLogs.details, `%${options.search}%`));

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(auditLogs)
      .where(and(...conditions));

    return { data: rows, total: Number(count) };
  }
}
