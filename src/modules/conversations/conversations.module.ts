import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConversationsService } from './conversations.service';
import { ConversationsProcessor } from './conversations.processor';
import { ConversationsGateway } from './conversations.gateway';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    BullModule.registerQueue({
      name: 'inbound-messages',
    }),
  ],
  providers: [
    ConversationsService,
    ConversationsProcessor,
    ConversationsGateway,
  ],
  exports: [ConversationsService, ConversationsGateway],
})
export class ConversationsModule {}
