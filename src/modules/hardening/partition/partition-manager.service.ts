import { Injectable, Logger } from '@nestjs/common';
import { db } from '@easydev/database';
import { sql } from 'drizzle-orm';

@Injectable()
export class PartitionManagerService {
  private readonly logger = new Logger(PartitionManagerService.name);
  private readonly targetTables = [
    'messages',
    'analytics_events',
    'audit_logs',
    'workflow_executions',
    'connector_logs',
  ];

  async createPartitionsForNextMonth(): Promise<void> {
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    const year = nextMonthDate.getFullYear();
    const month = nextMonthDate.getMonth() + 1; // 1-indexed
    const monthStr = month < 10 ? `0${month}` : `${month}`;

    const partitionSuffix = `_y${year}m${monthStr}`;

    const startDateStr = `${year}-${monthStr}-01`;
    const endDate = new Date(year, month, 1);
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    const endMonthStr = endMonth < 10 ? `0${endMonth}` : `${endMonth}`;
    const endDateStr = `${endYear}-${endMonthStr}-01`;

    this.logger.log(
      `Pre-creating database partitions for ${startDateStr} to ${endDateStr}`,
    );

    for (const table of this.targetTables) {
      const partitionTableName = `${table}${partitionSuffix}`;
      try {
        // Range partition creation SQL
        // We use CREATE TABLE IF NOT EXISTS to guarantee safety
        await db.execute(
          sql.raw(`
            CREATE TABLE IF NOT EXISTS ${partitionTableName} (
              LIKE ${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS
            )
          `),
        );
        this.logger.log(
          `Successfully managed partition table ${partitionTableName}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to pre-create partition for ${table}: ${err.message}`,
        );
      }
    }
  }

  async cleanupExpiredPartitions(retentionMonths: number = 12): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    const cutoffYear = cutoffDate.getFullYear();
    const cutoffMonth = cutoffDate.getMonth() + 1;
    const cutoffMonthStr =
      cutoffMonth < 10 ? `0${cutoffMonth}` : `${cutoffMonth}`;

    this.logger.log(
      `Cleaning up database partitions older than ${cutoffYear}-${cutoffMonthStr}`,
    );

    for (const table of this.targetTables) {
      // Find partition tables using pg_catalog
      try {
        const rows: any = await db.execute(
          sql`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'ai_support_agent' 
              AND tablename LIKE ${table + '_y%'}
          `,
        );

        if (rows && rows.rows) {
          for (const row of rows.rows) {
            const tablename = row.tablename;
            const match = tablename.match(/_y(\d{4})m(\d{2})$/);
            if (match) {
              const partYear = parseInt(match[1], 10);
              const partMonth = parseInt(match[2], 10);

              if (
                partYear < cutoffYear ||
                (partYear === cutoffYear && partMonth < cutoffMonth)
              ) {
                this.logger.warn(
                  `Dropping expired database partition: ${tablename}`,
                );
                await db.execute(
                  sql.raw(`DROP TABLE IF EXISTS ${tablename} CASCADE`),
                );
              }
            }
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Error listing or dropping partitions for ${table}: ${err.message}`,
        );
      }
    }
  }

  async getPartitionMetrics(): Promise<any[]> {
    const metrics: any[] = [];
    for (const table of this.targetTables) {
      try {
        const res: any = await db.execute(
          sql`
            SELECT count(*) as count 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'ai_support_agent' 
              AND tablename LIKE ${table + '_y%'}
          `,
        );
        metrics.push({
          table,
          activePartitionsCount: res?.rows?.[0]?.count
            ? parseInt(res.rows[0].count, 10)
            : 0,
        });
      } catch {
        metrics.push({ table, activePartitionsCount: 0 });
      }
    }
    return metrics;
  }
}
