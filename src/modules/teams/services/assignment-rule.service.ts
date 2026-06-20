import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ITeamRepository } from '../repositories/team-repository.interface';
import { AssignmentRule } from '../domain/assignment-rule.entity';
import { AssignmentStrategyEnum } from '../domain/value-objects';
import { randomUUID } from 'crypto';

@Injectable()
export class AssignmentRuleService {
  constructor(
    @Inject('ITeamRepository')
    private readonly teamRepo: ITeamRepository
  ) {}

  async createRule(
    tenantId: string,
    teamId: string,
    ruleType: AssignmentStrategyEnum,
    priority: number,
    configuration?: Record<string, any>
  ): Promise<AssignmentRule> {
    const team = await this.teamRepo.findById(teamId, tenantId);
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const rule = new AssignmentRule(randomUUID(), {
      tenantId,
      teamId,
      ruleType,
      priority,
      configuration,
      isActive: true,
    });

    team.addRule(rule);
    await this.teamRepo.save(team, tenantId);
    return rule;
  }

  async findRules(tenantId: string, teamId: string): Promise<AssignmentRule[]> {
    return this.teamRepo.findRules(teamId, tenantId);
  }

  async deleteRule(tenantId: string, ruleId: string): Promise<void> {
    await this.teamRepo.deleteRule(ruleId, tenantId);
  }
}
