import { Module, forwardRef } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { ChannelsModule } from '../channels/channels.module';
import { CustomersModule } from '../customers/customers.module';
import { WidgetModule } from '../widget/widget.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AnalyticsModule } from '../analytics/analytics.module';

import { MessageController } from './controllers/message.controller';
import { AttachmentController } from './controllers/attachment.controller';
import { TemplateController } from './controllers/template.controller';
import { DraftController } from './controllers/draft.controller';
import { InboundController } from './controllers/inbound.controller';
import { WidgetChatController } from './controllers/widget-chat.controller';

import {
  MessageService,
  MessageDeliveryService,
  MessageAttachmentService,
  MessageTemplateService,
  MessageDraftService,
  MessageSearchService,
  MessageInboundService,
  MessageReadModelService,
  MessageEventPublisher,
} from './services';

import { DrizzleMessageRepository } from './repositories/drizzle-message.repository';
import { DrizzleMessageTemplateRepository } from './repositories/drizzle-message-template.repository';
import { DrizzleMessageDraftRepository } from './repositories/drizzle-message-draft.repository';
import { MessageQueueProcessor } from './jobs/message-queue.processor';
import { QUEUES } from '@easydev/shared-queues';
import { shouldRunProcessor } from '../../config/queue-role';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    forwardRef(() => ChannelsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => WidgetModule),
    forwardRef(() => WorkflowsModule),
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [
    MessageController,
    AttachmentController,
    TemplateController,
    DraftController,
    InboundController,
    WidgetChatController,
  ],
  providers: [
    MessageService,
    MessageDeliveryService,
    MessageAttachmentService,
    MessageTemplateService,
    MessageDraftService,
    MessageSearchService,
    MessageInboundService,
    MessageReadModelService,
    MessageEventPublisher,
    ...(shouldRunProcessor(QUEUES.MESSAGE) ? [MessageQueueProcessor] : []),
    {
      provide: 'IMessageRepository',
      useClass: DrizzleMessageRepository,
    },
    {
      provide: 'IMessageTemplateRepository',
      useClass: DrizzleMessageTemplateRepository,
    },
    {
      provide: 'IMessageDraftRepository',
      useClass: DrizzleMessageDraftRepository,
    },
  ],
  exports: [
    MessageService,
    MessageDeliveryService,
    MessageAttachmentService,
    MessageInboundService,
    MessageDraftService,
    'IMessageRepository',
  ],
})
export class MessagesModule {}
