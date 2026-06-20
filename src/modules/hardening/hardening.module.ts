import { Module } from '@nestjs/common';
import { HardeningController } from './controllers/hardening.controller';
import { CostTrackerService } from './cost/cost-tracker.service';
import { OutboxService } from './outbox/outbox.service';
import { CacheManagerService } from './caching/cache-manager.service';
import { PartitionManagerService } from './partition/partition-manager.service';
import { HardeningSchedulerService } from './jobs/hardening-scheduler.service';

@Module({
  controllers: [HardeningController],
  providers: [
    CostTrackerService,
    OutboxService,
    CacheManagerService,
    PartitionManagerService,
    HardeningSchedulerService,
  ],
  exports: [
    CostTrackerService,
    OutboxService,
    CacheManagerService,
    PartitionManagerService,
  ],
})
export class HardeningModule {}
