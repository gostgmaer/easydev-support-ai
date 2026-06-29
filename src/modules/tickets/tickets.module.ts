import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CustomersModule } from '../customers/customers.module';
import { TeamsModule } from '../teams/teams.module';
import { InboxModule } from '../inbox/inbox.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { SettingsModule } from '../settings/settings.module';

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
import { OfflineAgentScheduler } from './jobs/offline-agent.scheduler';
import { QUEUES } from '@easydev/shared-queues';
import { shouldRunProcessor } from '../../config/queue-role';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => CustomersModule),
    TeamsModule,
    InboxModule,
    ConversationsModule,
    forwardRef(() => WorkflowsModule),
    forwardRef(() => SettingsModule),
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
    ...(shouldRunProcessor(QUEUES.TICKET) ? [TicketQueueProcessor] : []),
    SlaMonitorScheduler,
    OfflineAgentScheduler,
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
