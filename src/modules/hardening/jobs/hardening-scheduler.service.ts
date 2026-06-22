import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { OutboxService } from '../outbox/outbox.service';
import { PartitionManagerService } from '../partition/partition-manager.service';

@Injectable()
export class HardeningSchedulerService {
  private readonly logger = new Logger(HardeningSchedulerService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly partitionManager: PartitionManagerService,
  ) {}

  // Run outbox events processor every 5 seconds
  @Interval(5000)
  async processOutbox() {
    try {
      const processed = await this.outboxService.processPendingEvents();
      if (processed > 0) {
        this.logger.log(
          `[Outbox] Processed ${processed} pending events from outbox.`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error processing outbox events: ${err.message}`);
    }
  }

  // Pre-create range partitions for next month daily at 1:00 AM
  @Cron('0 1 * * *')
  async preCreatePartitions() {
    try {
      await this.partitionManager.createPartitionsForNextMonth();
    } catch (err: any) {
      this.logger.error(`Error pre-creating partitions: ${err.message}`);
    }
  }

  // Drop partitions older than 12 months & clean old outbox weekly on Sundays at midnight
  @Cron('0 0 * * 0')
  async performWeeklyMaintenance() {
    this.logger.log(
      'Starting weekly database maintenance and partition cleanups.',
    );
    try {
      await this.partitionManager.cleanupExpiredPartitions(12);
      const cleaned = await this.outboxService.cleanupProcessedEvents(7); // retain 7 days
      this.logger.log(
        `[Outbox] Cleaned up old processed events. Code: ${cleaned}`,
      );
    } catch (err: any) {
      this.logger.error(`Error during weekly maintenance: ${err.message}`);
    }
  }
}
