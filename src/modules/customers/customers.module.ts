import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsModule } from '../workflows/workflows.module';
import { CustomerController } from './controllers/customer.controller';
import { CustomerSegmentController } from './controllers/customer-segment.controller';
import { CustomerMetricsController } from './controllers/customer-metrics.controller';
import {
  CustomerService,
  CustomerProfileService,
  CustomerSegmentService,
  CustomerMetricsService,
  CustomerSearchService,
  CustomerTimelineService,
  CustomerEventPublisher,
} from './services';
import { DrizzleCustomerRepository } from './repositories/drizzle-customer.repository';
import { DrizzleCustomerSegmentRepository } from './repositories/drizzle-customer-segment.repository';
import { CustomerQueueProcessor } from './jobs/customer-queue.processor';

// TypeORM Entities for compatibility
import { Customer } from './entities/customer.entity';
import { CustomerSegment } from './entities/customer-segment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerSegment]),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [
    CustomerController,
    CustomerSegmentController,
    CustomerMetricsController,
  ],
  providers: [
    CustomerService,
    // Alias for compatibility
    {
      provide: 'CustomersService',
      useExisting: CustomerService,
    },
    CustomerProfileService,
    CustomerSegmentService,
    CustomerMetricsService,
    CustomerSearchService,
    CustomerTimelineService,
    CustomerEventPublisher,
    CustomerQueueProcessor,
    {
      provide: 'ICustomerRepository',
      useClass: DrizzleCustomerRepository,
    },
    {
      provide: 'ICustomerSegmentRepository',
      useClass: DrizzleCustomerSegmentRepository,
    },
  ],
  exports: [
    CustomerService,
    CustomerProfileService,
    CustomerSegmentService,
    CustomerMetricsService,
    CustomerSearchService,
    CustomerTimelineService,
    'ICustomerRepository',
    'ICustomerSegmentRepository',
  ],
})
export class CustomersModule {}
