import {
  Controller,
  Get,
  Post,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CostTrackerService } from '../cost/cost-tracker.service';
import { OutboxService } from '../outbox/outbox.service';
import { CacheManagerService } from '../caching/cache-manager.service';
import { PartitionManagerService } from '../partition/partition-manager.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Production Hardening')
@Controller('v1/hardening')
export class HardeningController {
  constructor(
    private readonly costTracker: CostTrackerService,
    private readonly outboxService: OutboxService,
    private readonly cacheManager: CacheManagerService,
    private readonly partitionManager: PartitionManagerService,
  ) {}

  @ApiOperation({ summary: 'Get tenant cost and usage metrics' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @Get('cost')
  async getCostReport(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Missing tenant ID');
    return this.costTracker.getUsageMetrics(tenantId);
  }

  @ApiOperation({ summary: 'Trigger replay of failed outbox events' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @Post('outbox/replay')
  async triggerOutboxReplay(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Missing tenant ID');
    const replayed = await this.outboxService.replayFailedEvents(tenantId);
    return { success: true, replayedCount: replayed };
  }

  @ApiOperation({ summary: 'Get caching adapter hit/miss metrics' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @Get('cache/metrics')
  async getCacheMetrics() {
    return this.cacheManager.getCacheMetrics();
  }

  @ApiOperation({ summary: 'Get active partitioned tables count' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @Get('partition/metrics')
  async getPartitionMetrics() {
    return this.partitionManager.getPartitionMetrics();
  }
}
