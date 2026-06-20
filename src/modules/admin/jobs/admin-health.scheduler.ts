import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService, QUEUES } from '@easydev/shared-queues';

/**
 * Refreshes platform-wide connector health on a fixed cadence. Per-tenant
 * system-health sweeps are triggered on demand (POST /v1/admin/health/sweep)
 * rather than blindly cron'd across every tenant, to stay cheap at scale.
 */
@Injectable()
export class AdminHealthScheduler {
  private readonly logger = new Logger(AdminHealthScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async enqueueHealthSweep(): Promise<void> {
    try {
      await this.queueService.addJob(QUEUES.ADMIN, 'admin-health-job', {
        scheduledAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue admin health sweep: ${message}`);
    }
  }
}
