import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CustomersModule } from '../customers/customers.module';
import { TeamsModule } from '../teams/teams.module';
import { InboxModule } from '../inbox/inbox.module';
import { WorkflowsModule } from '../workflows/workflows.module';

import { TicketController } from './controllers/ticket.controller';
import { TicketCommentController } from './controllers/ticket-comment.controller';
import { TicketCategoryController } from './controllers/ticket-category.controller';
import { TicketApprovalController } from './controllers/ticket-approval.controller';
import { TicketSLAController } from './controllers/ticket-sla.controller';

import {
  TicketService,
  TicketAssignmentService,
  TicketCommentService,
  TicketSLAService,
  TicketApprovalService,
  TicketCategoryService,
  TicketEscalationService,
  TicketEventPublisher,
} from './services';

import { DrizzleTicketRepository } from './repositories/drizzle-ticket.repository';
import { DrizzleTicketCategoryRepository } from './repositories/drizzle-ticket-category.repository';
import { TicketQueueProcessor } from './jobs/ticket-queue.processor';
import { SlaMonitorScheduler } from './jobs/sla-monitor.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => CustomersModule),
    TeamsModule,
    InboxModule,
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [
    TicketController,
    TicketCommentController,
    TicketCategoryController,
    TicketApprovalController,
    TicketSLAController,
  ],
  providers: [
    TicketService,
    TicketAssignmentService,
    TicketCommentService,
    TicketSLAService,
    TicketApprovalService,
    TicketCategoryService,
    TicketEscalationService,
    TicketEventPublisher,
    TicketQueueProcessor,
    SlaMonitorScheduler,
    {
      provide: 'ITicketRepository',
      useClass: DrizzleTicketRepository,
    },
    {
      provide: 'ITicketCategoryRepository',
      useClass: DrizzleTicketCategoryRepository,
    },
  ],
  exports: [
    TicketService,
    TicketAssignmentService,
    TicketSLAService,
    TicketEscalationService,
    'ITicketRepository',
  ],
})
export class TicketsModule {}
