import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// TypeORM Entities for compatibility
import {
  WorkflowTemplate,
  WorkflowVersion,
  WorkflowExecution,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  WorkflowApproval,
  WorkflowSchedule,
  WorkflowAuditLog,
  WorkflowVariable,
} from './entities';

// Controllers
import {
  WorkflowTemplateController,
  WorkflowExecutionController,
  WorkflowApprovalController,
  WorkflowScheduleController,
  WorkflowAuditController,
} from './controllers';

// Services
import {
  WorkflowTemplateService,
  WorkflowExecutionService,
  WorkflowApprovalService,
  WorkflowScheduleService,
  WorkflowTriggerService,
  WorkflowActionService,
  WorkflowAuditService,
  WorkflowEngineService,
  WorkflowEventPublisher,
} from './services';

// Repositories
import { DrizzleWorkflowRepository } from './repositories/drizzle-workflow.repository';

// Queue Jobs
import { WorkflowQueueProcessor } from './jobs/workflow-queue.processor';

// External Modules
import { TicketsModule } from '../tickets/tickets.module';
import { MessagesModule } from '../messages/messages.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { InboxModule } from '../inbox/inbox.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowTemplate,
      WorkflowVersion,
      WorkflowExecution,
      WorkflowTrigger,
      WorkflowCondition,
      WorkflowAction,
      WorkflowApproval,
      WorkflowSchedule,
      WorkflowAuditLog,
      WorkflowVariable,
    ]),
    BullModule.registerQueue({
      name: 'workflow-queue',
    }),
    forwardRef(() => TicketsModule),
    forwardRef(() => MessagesModule),
    forwardRef(() => ConnectorsModule),
    forwardRef(() => AiIntegrationModule),
    InboxModule,
    forwardRef(() => CustomersModule),
  ],
  controllers: [
    WorkflowTemplateController,
    WorkflowExecutionController,
    WorkflowApprovalController,
    WorkflowScheduleController,
    WorkflowAuditController,
  ],
  providers: [
    {
      provide: 'IWorkflowRepository',
      useClass: DrizzleWorkflowRepository,
    },
    WorkflowEventPublisher,
    WorkflowTemplateService,
    WorkflowExecutionService,
    WorkflowApprovalService,
    WorkflowScheduleService,
    WorkflowTriggerService,
    WorkflowActionService,
    WorkflowAuditService,
    WorkflowEngineService,
    WorkflowQueueProcessor,
  ],
  exports: [
    WorkflowTemplateService,
    WorkflowExecutionService,
    WorkflowApprovalService,
    WorkflowScheduleService,
    WorkflowTriggerService,
    WorkflowActionService,
    WorkflowAuditService,
    WorkflowEngineService,
    'IWorkflowRepository',
  ],
})
export class WorkflowsModule {}
