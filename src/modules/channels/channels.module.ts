import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './entities/channel.entity';
import { ChannelsWebhookController } from './channels.controller';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel]),
    ConversationsModule, // For dispatching webhooks
  ],
  controllers: [ChannelsWebhookController],
})
export class ChannelsModule {}
