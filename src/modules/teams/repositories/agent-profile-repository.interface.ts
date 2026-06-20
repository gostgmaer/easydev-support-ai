import { ITenantRepository } from '@easydev/shared-kernel';
import { AgentProfile } from '../domain/agent-profile.entity';

export interface AgentProfileQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  status?: string;
}

export interface IAgentProfileRepository extends ITenantRepository<
  AgentProfile,
  string
> {
  findByUserId(userId: string, tenantId: string): Promise<AgentProfile | null>;
  findByEmployeeCode(
    employeeCode: string,
    tenantId: string,
  ): Promise<AgentProfile | null>;
  findPaginated(
    tenantId: string,
    options: AgentProfileQueryOptions,
  ): Promise<{ data: AgentProfile[]; total: number }>;
}
