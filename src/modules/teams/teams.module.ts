import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from './controllers/team.controller';
import { AgentProfileController } from './controllers/agent-profile.controller';
import { AvailabilityController } from './controllers/availability.controller';
import { AssignmentController } from './controllers/assignment.controller';
import {
  TeamService,
  AgentProfileService,
  AssignmentRuleService,
  AgentAvailabilityService,
  AgentAssignmentService,
  TeamEventPublisher,
} from './services';
import { DrizzleTeamRepository } from './repositories/drizzle-team.repository';
import { DrizzleAgentProfileRepository } from './repositories/drizzle-agent-profile.repository';
import { DrizzleAgentAvailabilityRepository } from './repositories/drizzle-agent-availability.repository';
import { TeamQueueProcessor } from './jobs/team-queue.processor';

// TypeORM Entities for compatibility
import { Team } from './entities/team.entity';
import { AgentProfile } from './entities/agent-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Team, AgentProfile])],
  controllers: [
    TeamController,
    AgentProfileController,
    AvailabilityController,
    AssignmentController,
  ],
  providers: [
    TeamService,
    {
      provide: 'TeamsService',
      useExisting: TeamService,
    },
    AgentProfileService,
    AssignmentRuleService,
    AgentAvailabilityService,
    AgentAssignmentService,
    TeamEventPublisher,
    TeamQueueProcessor,
    {
      provide: 'ITeamRepository',
      useClass: DrizzleTeamRepository,
    },
    {
      provide: 'IAgentProfileRepository',
      useClass: DrizzleAgentProfileRepository,
    },
    {
      provide: 'IAgentAvailabilityRepository',
      useClass: DrizzleAgentAvailabilityRepository,
    },
  ],
  exports: [
    TeamService,
    AgentProfileService,
    AssignmentRuleService,
    AgentAvailabilityService,
    AgentAssignmentService,
    'ITeamRepository',
    'IAgentProfileRepository',
    'IAgentAvailabilityRepository',
  ],
})
export class TeamsModule {}
