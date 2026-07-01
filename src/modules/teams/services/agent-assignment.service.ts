import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { ITeamRepository } from '../repositories/team-repository.interface';
import type { IAgentProfileRepository } from '../repositories/agent-profile-repository.interface';
import type { IAgentAvailabilityRepository } from '../repositories/agent-availability-repository.interface';
import { AssignmentStrategyEnum } from '../domain/value-objects';
import { TeamEventPublisher } from './team-event.publisher';
import { AssignmentCompletedEvent } from '@easydev/shared-events';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AgentAssignmentService {
  constructor(
    @Inject('ITeamRepository')
    private readonly teamRepo: ITeamRepository,
    @Inject('IAgentProfileRepository')
    private readonly profileRepo: IAgentProfileRepository,
    @Inject('IAgentAvailabilityRepository')
    private readonly availabilityRepo: IAgentAvailabilityRepository,
    private readonly eventPublisher: TeamEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Managers had no way to see who on a team is currently overloaded - the
   * data (currentLoad/activeConversations/activeTickets vs each agent's
   * configured capacity) already existed in AgentAvailability/AgentProfile,
   * nothing surfaced it as a team-wide view.
   */
  async getTeamWorkload(tenantId: string, teamId: string) {
    const team = await this.teamRepo.findById(teamId, tenantId);
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const members = await this.teamRepo.findTeamMembers(teamId, tenantId);

    return Promise.all(
      members.map(async (member) => {
        const profile = await this.profileRepo.findById(
          member.agentProfileId,
          tenantId,
        );
        const availability = await this.availabilityRepo.findByAgentProfileId(
          member.agentProfileId,
          tenantId,
        );

        const maxConcurrentConversations =
          profile?.capacity.maxConcurrentConversations ?? null;
        const maxOpenTickets = profile?.capacity.maxOpenTickets ?? null;
        const activeConversations = availability?.activeConversations ?? 0;
        const activeTickets = availability?.activeTickets ?? 0;

        return {
          agentProfileId: member.agentProfileId,
          displayName: profile?.displayName ?? null,
          status: availability?.status ?? 'OFFLINE',
          currentLoad: availability?.currentLoad ?? 0,
          activeConversations,
          activeTickets,
          maxConcurrentConversations,
          maxOpenTickets,
          isOverloaded:
            (maxConcurrentConversations !== null &&
              activeConversations >= maxConcurrentConversations) ||
            (maxOpenTickets !== null && activeTickets >= maxOpenTickets),
        };
      }),
    );
  }

  async assignEntity(
    tenantId: string,
    teamId: string,
    entityId: string,
    entityType: 'TICKET' | 'CONVERSATION',
    options?: { requiredSkill?: number; priority?: number },
  ): Promise<string> {
    const team = await this.teamRepo.findById(teamId, tenantId);
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const rules = await this.teamRepo.findRules(teamId, tenantId);
    const activeRule = rules.find((r) => r.isActive);
    const strategy = activeRule?.ruleType || AssignmentStrategyEnum.ROUND_ROBIN;

    const members = await this.teamRepo.findTeamMembers(teamId, tenantId);
    if (members.length === 0) {
      throw new BadRequestException('No agents registered in the target team');
    }

    const onlineAgents: Array<{ profile: any; availability: any }> = [];

    for (const member of members) {
      const profile = await this.profileRepo.findById(
        member.agentProfileId,
        tenantId,
      );
      const availability = await this.availabilityRepo.findByAgentProfileId(
        member.agentProfileId,
        tenantId,
      );

      if (profile && availability && availability.status === 'ONLINE') {
        let hasCapacity = true;
        if (entityType === 'CONVERSATION') {
          hasCapacity =
            availability.activeConversations <
            profile.capacity.maxConcurrentConversations;
        } else {
          hasCapacity =
            availability.activeTickets < profile.capacity.maxOpenTickets;
        }

        if (hasCapacity) {
          onlineAgents.push({ profile, availability });
        }
      }
    }

    if (onlineAgents.length === 0) {
      const fallbackList: any[] = [];
      for (const member of members) {
        const profile = await this.profileRepo.findById(
          member.agentProfileId,
          tenantId,
        );
        const availability = await this.availabilityRepo.findByAgentProfileId(
          member.agentProfileId,
          tenantId,
        );
        if (profile && availability) {
          fallbackList.push({ profile, availability });
        }
      }

      if (fallbackList.length === 0) {
        throw new BadRequestException(
          'No agents online or available for fallback in this team',
        );
      }

      fallbackList.sort(
        (a, b) => a.availability.currentLoad - b.availability.currentLoad,
      );
      const fallbackAgent = fallbackList[0];
      await this.routeAssignment(
        tenantId,
        fallbackAgent.profile.id,
        entityId,
        entityType,
        'FALLBACK',
      );
      return fallbackAgent.profile.id;
    }

    let selectedAgent: { profile: any; availability: any };

    switch (strategy) {
      case AssignmentStrategyEnum.LEAST_LOADED:
        onlineAgents.sort(
          (a, b) => a.availability.currentLoad - b.availability.currentLoad,
        );
        selectedAgent = onlineAgents[0];
        break;

      case AssignmentStrategyEnum.SKILL_BASED: {
        const requiredSkill = options?.requiredSkill || 0;
        const skilledAgents = onlineAgents.filter(
          (a) => a.profile.skillScore >= requiredSkill,
        );
        const candidates =
          skilledAgents.length > 0 ? skilledAgents : onlineAgents;
        candidates.sort((a, b) => b.profile.skillScore - a.profile.skillScore);
        selectedAgent = candidates[0];
        break;
      }

      case AssignmentStrategyEnum.PRIORITY_BASED:
        onlineAgents.sort((a, b) => {
          if (b.profile.skillScore !== a.profile.skillScore) {
            return b.profile.skillScore - a.profile.skillScore;
          }
          return a.availability.currentLoad - b.availability.currentLoad;
        });
        selectedAgent = onlineAgents[0];
        break;

      case AssignmentStrategyEnum.ROUND_ROBIN:
      default:
        onlineAgents.sort(
          (a, b) =>
            a.availability.lastSeenAt.getTime() -
            b.availability.lastSeenAt.getTime(),
        );
        selectedAgent = onlineAgents[0];
        break;
    }

    await this.routeAssignment(
      tenantId,
      selectedAgent.profile.id,
      entityId,
      entityType,
      strategy,
    );
    return selectedAgent.profile.id;
  }

  private async routeAssignment(
    tenantId: string,
    agentProfileId: string,
    entityId: string,
    entityType: 'TICKET' | 'CONVERSATION',
    strategy: string,
  ): Promise<void> {
    const convChange = entityType === 'CONVERSATION' ? 1 : 0;
    const ticketChange = entityType === 'TICKET' ? 1 : 0;

    await this.availabilityRepo.updateCounters(
      agentProfileId,
      convChange,
      ticketChange,
      tenantId,
    );

    const assignmentId = randomUUID();
    await this.eventPublisher.publish(
      new AssignmentCompletedEvent(
        tenantId,
        assignmentId,
        agentProfileId,
        entityId,
        strategy,
      ),
    );

    await this.auditService.log({
      tenantId,
      action: 'ASSIGNMENT_COMPLETE',
      details: `Assigned ${entityType} ${entityId} to agent ${agentProfileId} using strategy ${strategy}`,
    });
  }
}
