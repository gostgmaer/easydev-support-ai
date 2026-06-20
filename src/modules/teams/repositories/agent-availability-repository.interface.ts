import { ITenantRepository } from '@easydev/shared-kernel';
import { AgentAvailability } from '../domain/agent-availability.entity';

export interface IAgentAvailabilityRepository extends ITenantRepository<AgentAvailability, string> {
  findByAgentProfileId(agentProfileId: string, tenantId: string): Promise<AgentAvailability | null>;
  findOnlineAgents(tenantId: string): Promise<AgentAvailability[]>;
  updateLoad(agentProfileId: string, change: number, tenantId: string): Promise<void>;
  updateCounters(
    agentProfileId: string,
    conversationsChange: number,
    ticketsChange: number,
    tenantId: string
  ): Promise<void>;
}
