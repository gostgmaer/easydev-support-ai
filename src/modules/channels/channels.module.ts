import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// TypeORM Entity compatibility
import { Channel as TypeOrmChannel } from './entities/channel.entity';

// Controllers
import { ChannelController } from './controllers/channel.controller';
import { ChannelWebhookController } from './controllers/channel-webhook.controller';
import { ChannelTemplateController } from './controllers/channel-template.controller';
import { ChannelHealthController } from './controllers/channel-health.controller';

// Services
import {
  ChannelService,
  ChannelConfigurationService,
  ChannelWebhookService,
  ChannelTemplateService,
  ChannelHealthService,
  ChannelMessageService,
  ChannelEventPublisher,
} from './services';

// Repositories
import { DrizzleChannelRepository } from './repositories/drizzle-channel.repository';

// Connectors & Registry
import { ChannelConnectorRegistry, CHANNEL_CONNECTORS_TOKEN } from './connectors/channel-connector.registry';
import {
  WebChatConnector,
  EmailConnector,
  WhatsAppConnector,
  TelegramConnector,
  FacebookConnector,
  InstagramConnector,
  SlackConnector,
  TeamsConnector,
} from './connectors/implementations';

// Queue jobs
import { ChannelQueueProcessor } from './jobs/channel-queue.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([TypeOrmChannel]),
    BullModule.registerQueue({
      name: 'channel-queue',
    }),
  ],
  controllers: [
    ChannelController,
    ChannelWebhookController,
    ChannelTemplateController,
    ChannelHealthController,
  ],
  providers: [
    // Services
    ChannelService,
    ChannelConfigurationService,
    ChannelWebhookService,
    ChannelTemplateService,
    ChannelHealthService,
    ChannelMessageService,
    ChannelEventPublisher,

    // Repositories
    {
      provide: 'IChannelRepository',
      useClass: DrizzleChannelRepository,
    },

    // Connectors
    WebChatConnector,
    EmailConnector,
    WhatsAppConnector,
    TelegramConnector,
    FacebookConnector,
    InstagramConnector,
    SlackConnector,
    TeamsConnector,
    {
      provide: CHANNEL_CONNECTORS_TOKEN,
      useFactory: (
        webChat: WebChatConnector,
        email: EmailConnector,
        whatsapp: WhatsAppConnector,
        telegram: TelegramConnector,
        facebook: FacebookConnector,
        instagram: InstagramConnector,
        slack: SlackConnector,
        teams: TeamsConnector
      ) => [webChat, email, whatsapp, telegram, facebook, instagram, slack, teams],
      inject: [
        WebChatConnector,
        EmailConnector,
        WhatsAppConnector,
        TelegramConnector,
        FacebookConnector,
        InstagramConnector,
        SlackConnector,
        TeamsConnector,
      ],
    },
    ChannelConnectorRegistry,

    // Queue Processor
    ChannelQueueProcessor,
  ],
  exports: [
    ChannelService,
    ChannelMessageService,
    ChannelWebhookService,
    'IChannelRepository',
  ],
})
export class ChannelsModule {}
