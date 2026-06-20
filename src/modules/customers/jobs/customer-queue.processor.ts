import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { CustomerSegmentService } from '../services/customer-segment.service';
import { CustomerMetricsService } from '../services/customer-metrics.service';

@Processor('customer-queue')
@Injectable()
export class CustomerQueueProcessor extends BaseWorker {
  constructor(
    private readonly customerService: CustomerService,
    private readonly segmentService: CustomerSegmentService,
    private readonly metricsService: CustomerMetricsService,
    @Optional() queueService?: QueueService,
  ) {
    super('CustomerQueueProcessor', QUEUES.CUSTOMER, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId;
    if (!tenantId) {
      this.logger.warn(
        `Job ${job.id} [${job.name}] ran without tenantId context`,
      );
    }

    switch (job.name) {
      case 'customer-import-job':
        this.logger.log(`Running customer import job ${job.id}`);
        return this.customerService.import(
          tenantId,
          job.data.records,
          job.data.userId,
        );

      case 'customer-export-job':
        this.logger.log(`Running customer export job ${job.id}`);
        const csv = await this.customerService.export(
          tenantId,
          job.data.format || 'CSV',
        );
        return { length: csv.length };

      case 'customer-metrics-job':
        this.logger.log(
          `Running customer metrics recalculation for ${job.data.customerId}`,
        );
        return this.metricsService.recalculateMetrics(
          tenantId,
          job.data.customerId,
        );

      case 'customer-segmentation-job':
        this.logger.log(
          `Running customer segmentation check for customer ${job.data.customerId}`,
        );
        const activeSegments =
          await this.segmentService.findAllSegments(tenantId);
        for (const segment of activeSegments) {
          if (segment.segmentType === 'DYNAMIC') {
            await this.segmentService.runDynamicSegmentation(
              tenantId,
              segment.id,
            );
          }
        }
        return { status: 'success' };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
