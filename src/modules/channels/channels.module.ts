import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Channel } from './entities/channel.entity';
import { ChannelsController } from './channels.controller';
import { WebhookService } from './webhook.service';
import { NormalizationService } from './normalization.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel]),
    BullModule.registerQueue({
      name: 'inbound-messages',
    }),
    ConversationsModule, // For dispatching webhooks
  ],
  controllers: [ChannelsController],
  providers: [WebhookService, NormalizationService],
  exports: [WebhookService, NormalizationService],
})
export class ChannelsModule {}
