import { Test, TestingModule } from '@nestjs/testing';
import { CustomerQueueProcessor } from './customer-queue.processor';
import { CustomerService } from '../services/customer.service';
import { CustomerSegmentService } from '../services/customer-segment.service';
import { CustomerMetricsService } from '../services/customer-metrics.service';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';

describe('CustomerQueueProcessor', () => {
  let processor: CustomerQueueProcessor;
  let customerService: any;
  let segmentService: any;
  let metricsService: any;

  const mockCustomerService = {
    import: jest.fn(),
    export: jest.fn(),
  };

  const mockSegmentService = {
    findAllSegments: jest.fn(),
    runDynamicSegmentation: jest.fn(),
  };

  const mockMetricsService = {
    recalculateMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerQueueProcessor,
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: CustomerSegmentService, useValue: mockSegmentService },
        { provide: CustomerMetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    processor = module.get<CustomerQueueProcessor>(CustomerQueueProcessor);
    customerService = module.get<CustomerService>(CustomerService);
    segmentService = module.get<CustomerSegmentService>(CustomerSegmentService);
    metricsService = module.get<CustomerMetricsService>(CustomerMetricsService);

    jest.clearAllMocks();
  });

  describe('handleJob', () => {
    const tenantId = randomUUID();

    it('should route customer-import-job', async () => {
      const job: Partial<Job> = {
        name: 'customer-import-job',
        id: 'job-1',
        data: {
          records: [{ email: 'import@easydev.com' }],
          userId: 'u1',
          _tenantContext: { tenantId },
        },
      };

      mockCustomerService.import.mockResolvedValue({ importedCount: 1, errors: [] });

      const res = await processor.handleJob(job as any);

      expect(res).toEqual({ importedCount: 1, errors: [] });
      expect(customerService.import).toHaveBeenCalledWith(tenantId, job.data.records, 'u1');
    });

    it('should route customer-metrics-job', async () => {
      const customerId = randomUUID();
      const job: Partial<Job> = {
        name: 'customer-metrics-job',
        id: 'job-2',
        data: {
          customerId,
          _tenantContext: { tenantId },
        },
      };

      mockMetricsService.recalculateMetrics.mockResolvedValue({ id: 'm1' });

      const res = await processor.handleJob(job as any);

      expect(res).toEqual({ id: 'm1' });
      expect(metricsService.recalculateMetrics).toHaveBeenCalledWith(tenantId, customerId);
    });

    it('should route customer-segmentation-job', async () => {
      const customerId = randomUUID();
      const job: Partial<Job> = {
        name: 'customer-segmentation-job',
        id: 'job-3',
        data: {
          customerId,
          _tenantContext: { tenantId },
        },
      };

      mockSegmentService.findAllSegments.mockResolvedValue([
        { id: 'seg-1', segmentType: 'DYNAMIC' },
        { id: 'seg-2', segmentType: 'STATIC' },
      ]);

      const res = await processor.handleJob(job as any);

      expect(res).toEqual({ status: 'success' });
      expect(segmentService.findAllSegments).toHaveBeenCalledWith(tenantId);
      expect(segmentService.runDynamicSegmentation).toHaveBeenCalledWith(tenantId, 'seg-1');
    });
  });
});
