import { Module } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { ChannelsModule } from '../channels/channels.module';
import { CustomersModule } from '../customers/customers.module';
import { WidgetModule } from '../widget/widget.module';

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

@Module({
  imports: [ConversationsModule, ChannelsModule, CustomersModule, WidgetModule],
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
    MessageQueueProcessor,
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
    'IMessageRepository',
  ],
})
export class MessagesModule {}
