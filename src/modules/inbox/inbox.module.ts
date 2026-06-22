import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

import { TeamsModule } from '../teams/teams.module';

import {
  InboxController,
  InboxAssignmentController,
  InboxSearchController,
  InboxBookmarkController,
  InboxPresenceController,
  InboxRealtimeController,
} from './controllers';

import {
  InboxService,
  InboxAssignmentService,
  InboxPresenceService,
  InboxRealtimeService,
  InboxSearchService,
  InboxBookmarkService,
  InboxSnoozeService,
  InboxActivityService,
  InboxProjectionService,
  InboxEventPublisher,
} from './services';

import { InboxEventConsumer } from './consumers/inbox-event.consumer';
import { DrizzleInboxRepository } from './repositories/drizzle-inbox.repository';
import { InboxQueueProcessor } from './jobs/inbox-queue.processor';
import { InboxCleanupScheduler } from './jobs/inbox-cleanup.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'inbox-queue' }),
    TeamsModule,
  ],
  controllers: [
    InboxBookmarkController,
    InboxAssignmentController,
    InboxSearchController,
    InboxPresenceController,
    InboxRealtimeController,
    InboxController,
  ],
  providers: [
    InboxService,
    InboxAssignmentService,
    InboxPresenceService,
    InboxRealtimeService,
    InboxSearchService,
    InboxBookmarkService,
    InboxSnoozeService,
    InboxActivityService,
    InboxProjectionService,
    InboxEventPublisher,
    InboxEventConsumer,
    InboxQueueProcessor,
    InboxCleanupScheduler,
    {
      provide: 'IInboxRepository',
      useClass: DrizzleInboxRepository,
    },
  ],
  exports: [
    InboxService,
    InboxAssignmentService,
    InboxPresenceService,
    InboxProjectionService,
    InboxSearchService,
    InboxRealtimeService,
    'IInboxRepository',
  ],
})
export class InboxModule {}
