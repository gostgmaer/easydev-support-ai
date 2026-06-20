import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import databaseConfig from './config/database.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { IntegrationModule } from './integration/integration.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { AuditModule } from './modules/audit/audit.module';
import { QueueModule } from '@easydev/shared-queues';
import { CustomersModule } from './modules/customers/customers.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TeamsModule } from './modules/teams/teams.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IamModule } from './modules/iam/iam.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// Entities
import { Customer } from './modules/customers/entities/customer.entity';
import { CustomerSegment } from './modules/customers/entities/customer-segment.entity';
import { Conversation } from './modules/conversations/entities/conversation.entity';
import { Message } from './modules/conversations/entities/message.entity';
import { ConversationTag } from './modules/conversations/entities/conversation-tag.entity';
import { ConversationNote } from './modules/conversations/entities/conversation-note.entity';
import { Attachment } from './modules/conversations/entities/attachment.entity';
import { Team } from './modules/teams/entities/team.entity';
import { AgentProfile } from './modules/teams/entities/agent-profile.entity';
import { Channel } from './modules/channels/entities/channel.entity';
import { ChannelConfiguration } from './modules/channels/entities/channel-configuration.entity';
import { Ticket } from './modules/tickets/entities/ticket.entity';
import { TicketComment } from './modules/tickets/entities/ticket-comment.entity';
import { TicketSla } from './modules/tickets/entities/ticket-sla.entity';
import { Connector } from './modules/connectors/entities/connector.entity';
import { ConnectorInstance } from './modules/connectors/entities/connector-instance.entity';
import { ConnectorCapability } from './modules/connectors/entities/connector-capability.entity';
import { ConnectorLog } from './modules/connectors/entities/connector-log.entity';
import { KnowledgeDocument } from './modules/knowledge-base/entities/knowledge-document.entity';
import { KnowledgeSource } from './modules/knowledge-base/entities/knowledge-source.entity';
import { KnowledgeChunk } from './modules/knowledge-base/entities/knowledge-chunk.entity';
import { Workflow } from './modules/workflows/entities/workflow.entity';
import { WorkflowExecution } from './modules/workflows/entities/workflow-execution.entity';
import { AnalyticsEvent } from './modules/analytics/entities/analytics-event.entity';
import { CsatSurvey } from './modules/analytics/entities/csat-survey.entity';
import { AuditLog } from './modules/iam/entities/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: parseInt(process.env.THROTTLE_TTL_MS || '60000', 10),
          limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('database'),
        entities: [
          Customer,
          CustomerSegment,
          Conversation,
          Message,
          ConversationTag,
          ConversationNote,
          Attachment,
          Team,
          AgentProfile,
          Channel,
          ChannelConfiguration,
          Ticket,
          TicketComment,
          TicketSla,
          Connector,
          ConnectorInstance,
          ConnectorCapability,
          ConnectorLog,
          KnowledgeDocument,
          KnowledgeSource,
          KnowledgeChunk,
          Workflow,
          WorkflowExecution,
          AnalyticsEvent,
          CsatSurvey,
          AuditLog,
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
    CustomersModule,
    TicketsModule,
    TeamsModule,
    KnowledgeBaseModule,
    AnalyticsModule,
    IamModule,
    NotificationsModule,
    ObservabilityModule,
    AuditModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
  ],
})
export class AppModule {}
