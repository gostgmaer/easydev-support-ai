import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, RoutingStrategy } from './entities/team.entity';
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
    const team = await this.teamRepo.findOne({ where: { id: teamId, tenantId } });
    
    if (!team) throw new Error('Team not found');

    this.logger.log(`Running Assignment Engine for Team ${team.name} (Strategy: ${team.routingStrategy})`);

    switch (team.routingStrategy) {
      case RoutingStrategy.ROUND_ROBIN:
        return this.roundRobinAssignment(tenantId, teamId);
      case RoutingStrategy.LEAST_LOADED:
        return this.leastLoadedAssignment(tenantId, teamId);
      case RoutingStrategy.SKILL_BASED:
        return this.skillBasedAssignment(tenantId, teamId, ['Technical']); // Mock skill requirement
      default:
        return this.roundRobinAssignment(tenantId, teamId);
    }
  }

  private async roundRobinAssignment(tenantId: string, teamId: string): Promise<string> {
    // Query active agents, sort by last assigned timestamp
    const agent = await this.agentRepo.createQueryBuilder('agent')
      .where('agent.tenantId = :tenantId', { tenantId })
      .andWhere('agent.teamId = :teamId', { teamId })
      .getOne();

    return agent?.userId || null;
  }

  private async leastLoadedAssignment(tenantId: string, teamId: string): Promise<string> {
    const agent = await this.agentRepo.findOne({ where: { tenantId, teamId } });
    return agent?.userId || null;
  }

  private async skillBasedAssignment(tenantId: string, teamId: string, requiredSkills: string[]): Promise<string> {
    const agent = await this.agentRepo.findOne({ where: { tenantId, teamId } });
    return agent?.userId || null;
  }
}
