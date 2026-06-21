import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// TypeORM Entities for compatibility
import { AiAgent as TypeOrmAiAgent } from './entities/ai-agent.entity';
import { AiConversationSession as TypeOrmAiSession } from './entities/ai-conversation-session.entity';
import { AiWorkflowExecution as TypeOrmAiWorkflow } from './entities/ai-workflow-execution.entity';

// Controllers
import {
  AiAgentController,
  AiWorkflowController,
  AiSessionController,
  AiUsageController,
  AiEscalationController,
} from './controllers';

// Services
import {
  AIPlatformClient,
  AiEventPublisher,
  AiAgentService,
  AiConversationService,
  AiWorkflowService,
  AiToolExecutionService,
  AiEscalationService,
  AiUsageService,
  AiRoutingService,
  AiResponseService,
} from './services';

// Repositories
import { DrizzleAiRepository } from './repositories/drizzle-ai.repository';

// Queue Jobs
import { AiQueueProcessor } from './jobs/ai-queue.processor';

// External Modules
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { CustomersModule } from '../customers/customers.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { InboxModule } from '../inbox/inbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TypeOrmAiAgent,
      TypeOrmAiSession,
      TypeOrmAiWorkflow,
    ]),
    BullModule.registerQueue({
      name: 'ai-queue',
    }),
    forwardRef(() => ConversationsModule),
    forwardRef(() => MessagesModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => ConnectorsModule),
    InboxModule,
  ],
  controllers: [
    AiAgentController,
    AiWorkflowController,
    AiSessionController,
    AiUsageController,
    AiEscalationController,
  ],
  providers: [
    // Repositories
    {
      provide: 'IAiRepository',
      useClass: DrizzleAiRepository,
    },

    // Event Publisher
    AiEventPublisher,

    // Clients
    AIPlatformClient,

    // Services
    AiAgentService,
    AiConversationService,
    AiWorkflowService,
    AiToolExecutionService,
    AiEscalationService,
    AiUsageService,
    AiRoutingService,
    AiResponseService,

    // Queue Processor
    AiQueueProcessor,
  ],
  exports: [
    AiAgentService,
    AiConversationService,
    AiWorkflowService,
    AiToolExecutionService,
    AiEscalationService,
    AiUsageService,
    AiRoutingService,
    AiResponseService,
    'IAiRepository',
  ],
})
export class AiIntegrationModule {}
export { TypeOrmAiAgent, TypeOrmAiSession, TypeOrmAiWorkflow };
