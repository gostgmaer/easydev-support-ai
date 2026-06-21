import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CustomersModule } from '../customers/customers.module';
import { PublicKnowledgeController } from './controllers/public-knowledge.controller';
import { PublicTicketController } from './controllers/public-ticket.controller';

/** The public, unauthenticated surface for apps/help-center - every other
 * knowledge-base/ticket controller requires an agent/admin IAM role, which
 * anonymous customers never have. This module only ever reuses existing
 * domain services; it adds no new persistence or business logic. */
@Module({
  imports: [KnowledgeBaseModule, TicketsModule, CustomersModule],
  controllers: [PublicKnowledgeController, PublicTicketController],
})
export class PublicHelpModule {}
