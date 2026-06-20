import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import databaseConfig from './config/database.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { IntegrationModule } from './integration/integration.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';

import { Customer } from './modules/customers/entities/customer.entity';
import { Conversation } from './modules/conversations/entities/conversation.entity';
import { Message } from './modules/conversations/entities/message.entity';
import { Team } from './modules/teams/entities/team.entity';
import { AgentProfile } from './modules/teams/entities/agent-profile.entity';
import { Channel } from './modules/channels/entities/channel.entity';
import { Ticket } from './modules/tickets/entities/ticket.entity';
import { Connector } from './modules/connectors/entities/connector.entity';
import { KnowledgeDocument } from './modules/knowledge-base/entities/knowledge-document.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('database'),
        entities: [
          Customer,
          Conversation,
          Message,
          Team,
          AgentProfile,
          Channel,
          Ticket,
          Connector,
          KnowledgeDocument,
        ],
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6380', 10),
        },
      }),
    }),
    IntegrationModule,
    ConversationsModule,
    ConnectorsModule,
    ChannelsModule,
    WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
