import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CustomersModule } from '../customers/customers.module';
import { SettingsModule } from '../settings/settings.module';
import { PublicKnowledgeController } from './controllers/public-knowledge.controller';
import { PublicTicketController } from './controllers/public-ticket.controller';
import { PublicHelpAiAssistController } from './controllers/public-help-ai-assist.controller';
import { PublicBrandingController } from './controllers/public-branding.controller';
import { AIPlatformClient } from '../ai-integration/services/ai-platform.client';

/** The public, unauthenticated surface for apps/help-center - every other
 * knowledge-base/ticket controller requires an agent/admin IAM role, which
 * anonymous customers never have. This module only ever reuses existing
 * domain services; it adds no new persistence or business logic.
 *
 * AIPlatformClient (ai-integration's, not knowledge-base's narrower
 * embed/rerank-only one of the same name) is provided directly here rather
 * than importing the whole AiIntegrationModule - it has no constructor
 * dependencies of its own (just reads env vars), and AiIntegrationModule
 * pulls in a web of forwardRef'd modules that aren't needed for this. */
@Module({
  imports: [KnowledgeBaseModule, TicketsModule, CustomersModule, SettingsModule],
  controllers: [
    PublicKnowledgeController,
    PublicTicketController,
    PublicHelpAiAssistController,
    PublicBrandingController,
  ],
  providers: [AIPlatformClient],
})
export class PublicHelpModule {}
