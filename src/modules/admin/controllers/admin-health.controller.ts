import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminHealthService } from '../services/admin-health.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';
import { QUEUES, QueueName } from '@easydev/shared-queues';

@ApiTags('Admin Health & Operations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/admin/health')
export class AdminHealthController {
  constructor(private readonly healthService: AdminHealthService) {}

  private resolveQueueName(queueName: string): QueueName {
    const match = Object.values(QUEUES).find((q) => q === queueName);
    if (!match) throw new NotFoundException(`Unknown queue: ${queueName}`);
    return match;
  }

  @Get()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List recorded system health checks' })
  async listSystemHealth(@Headers('x-tenant-id') tenantId: string) {
    const services = await this.healthService.listSystemHealth(tenantId);
    return services.map((s) => s.toJSON());
  }

  @Post('sweep')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Run an on-demand health sweep' })
  async runSweep(@Headers('x-tenant-id') tenantId: string) {
    const results = await this.healthService.runHealthSweep(tenantId);
    return results.map((s) => s.toJSON());
  }

  @Get('queues')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: stats for every BullMQ queue' })
  async listQueues() {
    return this.healthService.getAllQueueStats();
  }

  @Get('queues/:queueName')
  @Roles('tenant_admin')
  @ApiParam({ name: 'queueName', enum: Object.values(QUEUES) })
  @ApiOperation({ summary: 'Operations Center: stats for a single queue' })
  async getQueue(@Param('queueName') queueName: string) {
    return this.healthService.getQueueStats(this.resolveQueueName(queueName));
  }

  @Get('queues/:queueName/workers')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: connected workers for a queue' })
  async getWorkers(@Param('queueName') queueName: string) {
    return this.healthService.getWorkers(this.resolveQueueName(queueName));
  }

  @Get('queues/:queueName/failed')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: failed jobs for a queue' })
  async getFailedJobs(
    @Param('queueName') queueName: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.healthService.getFailedJobs(
      this.resolveQueueName(queueName),
      start ? parseInt(start, 10) : undefined,
      end ? parseInt(end, 10) : undefined,
    );
  }

  @Post('queues/:queueName/jobs/:jobId/retry')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: retry a failed job' })
  async retryJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    const retried = await this.healthService.retryJob(this.resolveQueueName(queueName), jobId);
    return { retried };
  }

  @Get('dead-letter')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: dead-letter queue contents' })
  async getDeadLetter(@Query('start') start?: string, @Query('end') end?: string) {
    return this.healthService.getDeadLetterJobs(
      start ? parseInt(start, 10) : undefined,
      end ? parseInt(end, 10) : undefined,
    );
  }

  @Post('dead-letter/:jobId/replay')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: replay a dead-letter job onto its source queue' })
  async replayDeadLetter(@Param('jobId') jobId: string) {
    const replayed = await this.healthService.replayDeadLetterJob(jobId);
    return { replayed };
  }

  @Get('workflows')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Operations Center: workflow execution status breakdown' })
  async getWorkflowMonitoring(@Headers('x-tenant-id') tenantId: string) {
    return this.healthService.getWorkflowMonitoring(tenantId);
  }
}
