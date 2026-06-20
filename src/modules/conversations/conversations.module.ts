import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersModule } from '../customers/customers.module';
import { TeamsModule } from '../teams/teams.module';

import { ConversationController } from './controllers/conversation.controller';
import { ConversationAssignmentController } from './controllers/conversation-assignment.controller';
import { ConversationTagController } from './controllers/conversation-tag.controller';
import { ConversationNoteController } from './controllers/conversation-note.controller';
import { InboxController } from './controllers/inbox.controller';

import {
  ConversationService,
  ConversationAssignmentService,
  ConversationTagService,
  ConversationNoteService,
  ConversationSearchService,
  ConversationSummaryService,
  InboxService,
  RedisCacheService,
  ConversationEventPublisher,
} from './services';

import { DrizzleConversationRepository } from './repositories/drizzle-conversation.repository';
import { ConversationQueueProcessor } from './jobs/conversation-queue.processor';
import { ConversationsGateway } from './conversations.gateway';

// TypeORM entities kept for compatibility with the global data source registration.
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationTag } from './entities/conversation-tag.entity';
import { ConversationNote } from './entities/conversation-note.entity';
import { Attachment } from './entities/attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      ConversationTag,
      ConversationNote,
      Attachment,
    ]),
    CustomersModule,
    TeamsModule,
  ],
  controllers: [
    ConversationController,
    ConversationAssignmentController,
    ConversationTagController,
    ConversationNoteController,
    InboxController,
  ],
  providers: [
    ConversationService,
    ConversationAssignmentService,
    ConversationTagService,
    ConversationNoteService,
    ConversationSearchService,
    ConversationSummaryService,
    InboxService,
    RedisCacheService,
    ConversationEventPublisher,
    ConversationQueueProcessor,
    ConversationsGateway,
    {
      provide: 'IConversationRepository',
      useClass: DrizzleConversationRepository,
    },
  ],
  exports: [
    ConversationService,
    ConversationAssignmentService,
    ConversationSummaryService,
    InboxService,
    ConversationsGateway,
    'IConversationRepository',
  ],
})
export class ConversationsModule {}
