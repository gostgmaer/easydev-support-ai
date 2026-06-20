import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { SlaEngineService } from './sla-engine.service';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketSla } from './entities/ticket-sla.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketComment, TicketSla])],
  controllers: [TicketsController],
  providers: [TicketsService, SlaEngineService],
  exports: [TicketsService, SlaEngineService],
})
export class TicketsModule {}
