import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller';
import { AssignmentService } from './assignment.service';
import { Team } from './entities/team.entity';
import { AgentProfile } from './entities/agent-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Team, AgentProfile])],
  controllers: [TeamsController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class TeamsModule {}
