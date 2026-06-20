import { ITenantRepository } from '@easydev/shared-kernel';
import { Team } from '../domain/team.aggregate';
import { TeamMember } from '../domain/team-member.entity';
import { AssignmentRule } from '../domain/assignment-rule.entity';

export interface TeamQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  department?: string;
}

export interface ITeamRepository extends ITenantRepository<Team, string> {
  findByName(name: string, tenantId: string): Promise<Team | null>;
  findPaginated(tenantId: string, options: TeamQueryOptions): Promise<{ data: Team[]; total: number }>;
  addMember(member: TeamMember, tenantId: string): Promise<void>;
  removeMember(teamId: string, agentProfileId: string, tenantId: string): Promise<void>;
  findTeamMembers(teamId: string, tenantId: string): Promise<TeamMember[]>;
  saveRule(rule: AssignmentRule, tenantId: string): Promise<void>;
  findRules(teamId: string, tenantId: string): Promise<AssignmentRule[]>;
  deleteRule(ruleId: string, tenantId: string): Promise<void>;
}
