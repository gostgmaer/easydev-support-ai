import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowsModule } from '../workflows/workflows.module';

// TypeORM Entities for compatibility registration in AppModule
import { Connector as TypeOrmConnector } from './entities/connector.entity';
import { ConnectorInstance as TypeOrmConnectorInstance } from './entities/connector-instance.entity';
import { ConnectorCapability as TypeOrmConnectorCapability } from './entities/connector-capability.entity';
import { ConnectorLog as TypeOrmConnectorLog } from './entities/connector-log.entity';

// Controllers
import {
  ConnectorsController,
  ConnectorExecutionsController,
  ConnectorWebhooksController,
} from './controllers';

// Services
import {
  ConnectorService,
  ConnectorRegistryService,
  ConnectorExecutionService,
  ConnectorCredentialService,
  ConnectorHealthService,
  ConnectorImportService,
  ConnectorWebhookService,
  ConnectorEventPublisher,
} from './services';

// Repositories
import { DrizzleConnectorRepository } from './repositories/drizzle-connector.repository';

// Engine
import {
  CapabilityResolver,
  ConnectorRegistry,
  ConnectorFactory,
  ExecutionEngine,
  RetryEngine,
  CredentialManager,
  WebhookDispatcher,
  CircuitBreakerManager,
} from './engine';

// Queue
import { ConnectorQueueProcessor } from './jobs/connector-queue.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TypeOrmConnector,
      TypeOrmConnectorInstance,
      TypeOrmConnectorCapability,
      TypeOrmConnectorLog,
    ]),
    BullModule.registerQueue({
      name: 'connector-queue',
    }),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [
    ConnectorsController,
    ConnectorExecutionsController,
    ConnectorWebhooksController,
  ],
  providers: [
    // Repository
    {
      provide: 'IConnectorRepository',
      useClass: DrizzleConnectorRepository,
    },

    // Event Publisher
    ConnectorEventPublisher,

    // Services
    ConnectorService,
    ConnectorRegistryService,
    ConnectorExecutionService,
    ConnectorCredentialService,
    ConnectorHealthService,
    ConnectorImportService,
    ConnectorWebhookService,

    // Engine Components
    CapabilityResolver,
    ConnectorRegistry,
    ConnectorFactory,
    ExecutionEngine,
    RetryEngine,
    CredentialManager,
    WebhookDispatcher,
    CircuitBreakerManager,

    // Queue Processor
    ConnectorQueueProcessor,
  ],
  exports: [
    ConnectorService,
    ConnectorRegistryService,
    ConnectorExecutionService,
    ConnectorCredentialService,
    ConnectorHealthService,
    ConnectorImportService,
    ConnectorWebhookService,
    'IConnectorRepository',
  ],
})
export class ConnectorsModule {}
