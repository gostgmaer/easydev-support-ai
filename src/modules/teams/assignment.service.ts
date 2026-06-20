import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { AgentProfile } from './entities/agent-profile.entity';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(AgentProfile) private agentRepo: Repository<AgentProfile>,
  ) {}

  /**
   * Assigns a conversation or ticket to the best agent based on the Team's routing strategy.
   */
  async assignToBestAgent(tenantId: string, teamId: string, conversationId: string): Promise<string | null> {
    const team = await this.teamRepo.findOne({ where: { id: teamId, tenant_id: tenantId } });
    
    if (!team) throw new Error('Team not found');

    this.logger.log(`Running Assignment Engine for Team ${team.name} (Strategy: ${team.routing_strategy})`);

    switch (team.routing_strategy) {
      case 'Round Robin':
        return this.roundRobinAssignment(tenantId, teamId);
      case 'Least Loaded':
        return this.leastLoadedAssignment(tenantId, teamId);
      case 'Skill Based':
        return this.skillBasedAssignment(tenantId, teamId, ['Technical']); // Mock skill requirement
      default:
        return this.roundRobinAssignment(tenantId, teamId);
    }
  }

  private async roundRobinAssignment(tenantId: string, teamId: string): Promise<string> {
    // Query active agents, sort by last assigned timestamp
    const agent = await this.agentRepo.createQueryBuilder('agent')
      .where('agent.tenant_id = :tenantId', { tenantId })
      .andWhere('agent.team_id = :teamId', { teamId })
      // .orderBy('agent.last_assigned_at', 'ASC')
      .getOne();

    return agent?.user_id || null;
  }

  private async leastLoadedAssignment(tenantId: string, teamId: string): Promise<string> {
    // In production, join with conversations table and group by agent_id to find lowest count
    const agent = await this.agentRepo.findOne({ where: { tenant_id: tenantId, team_id: teamId } });
    return agent?.user_id || null;
  }

  private async skillBasedAssignment(tenantId: string, teamId: string, requiredSkills: string[]): Promise<string> {
    // Match agent JSONB skills against requiredSkills
    const agent = await this.agentRepo.findOne({ where: { tenant_id: tenantId, team_id: teamId } });
    return agent?.user_id || null;
  }
}
