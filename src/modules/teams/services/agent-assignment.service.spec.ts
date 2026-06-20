import { Test, TestingModule } from '@nestjs/testing';
import { AgentAssignmentService } from './agent-assignment.service';
import { TeamEventPublisher } from './team-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { Team } from '../domain/team.aggregate';
import { TeamMember } from '../domain/team-member.entity';
import { AgentProfile } from '../domain/agent-profile.entity';
import { AgentAvailability } from '../domain/agent-availability.entity';
import { AgentCapacity, AssignmentStrategyEnum } from '../domain/value-objects';
import { AssignmentRule } from '../domain/assignment-rule.entity';
import { randomUUID } from 'crypto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AgentAssignmentService (Assignment Engine)', () => {
  let service: AgentAssignmentService;
  let teamRepo: any;
  let profileRepo: any;
  let availabilityRepo: any;
  let publisher: any;

  const mockTeamRepo = {
    findById: jest.fn(),
    findRules: jest.fn(),
    findTeamMembers: jest.fn(),
  };

  const mockProfileRepo = {
    findById: jest.fn(),
  };

  const mockAvailabilityRepo = {
    findByAgentProfileId: jest.fn(),
    updateCounters: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
    publishAll: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentAssignmentService,
        { provide: 'ITeamRepository', useValue: mockTeamRepo },
        { provide: 'IAgentProfileRepository', useValue: mockProfileRepo },
        {
          provide: 'IAgentAvailabilityRepository',
          useValue: mockAvailabilityRepo,
        },
        { provide: TeamEventPublisher, useValue: mockEventPublisher },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AgentAssignmentService>(AgentAssignmentService);
    teamRepo = module.get('ITeamRepository');
    profileRepo = module.get('IAgentProfileRepository');
    availabilityRepo = module.get('IAgentAvailabilityRepository');
    publisher = module.get(TeamEventPublisher);

    jest.clearAllMocks();
  });

  describe('assignEntity', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();
    const entityId = randomUUID();

    it('should throw NotFoundException if team does not exist', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(
        service.assignEntity(tenantId, teamId, entityId, 'CONVERSATION'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if team has no members', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team A',
        priority: 1,
        isActive: true,
      });
      teamRepo.findById.mockResolvedValue(team);
      teamRepo.findRules.mockResolvedValue([]);
      teamRepo.findTeamMembers.mockResolvedValue([]);

      await expect(
        service.assignEntity(tenantId, teamId, entityId, 'CONVERSATION'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should route using Fallback when no agent is online with capacity', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team A',
        priority: 1,
        isActive: true,
      });
      const agentId = randomUUID();
      const member = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agentId,
        role: 'MEMBER',
        isPrimary: false,
      });

      teamRepo.findById.mockResolvedValue(team);
      teamRepo.findRules.mockResolvedValue([]);
      teamRepo.findTeamMembers.mockResolvedValue([member]);

      // Agent is offline
      const agent = new AgentProfile(agentId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 1',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 5.0,
        timezone: 'UTC',
      });
      const availability = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agentId,
        status: 'OFFLINE',
        lastSeenAt: new Date(),
        currentLoad: 1,
        activeConversations: 1,
        activeTickets: 1,
      });

      profileRepo.findById.mockResolvedValue(agent);
      availabilityRepo.findByAgentProfileId.mockResolvedValue(availability);

      const assignedAgentId = await service.assignEntity(
        tenantId,
        teamId,
        entityId,
        'CONVERSATION',
      );

      expect(assignedAgentId).toBe(agentId);
      expect(availabilityRepo.updateCounters).toHaveBeenCalledWith(
        agentId,
        1,
        0,
        tenantId,
      );
      expect(publisher.publish).toHaveBeenCalled();
    });

    it('should route using Round Robin when strategy is default/ROUND_ROBIN', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team A',
        priority: 1,
        isActive: true,
      });
      const agent1Id = randomUUID();
      const agent2Id = randomUUID();
      const member1 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent1Id,
        role: 'MEMBER',
        isPrimary: false,
      });
      const member2 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent2Id,
        role: 'MEMBER',
        isPrimary: false,
      });

      teamRepo.findById.mockResolvedValue(team);
      teamRepo.findRules.mockResolvedValue([
        new AssignmentRule(randomUUID(), {
          tenantId,
          teamId,
          ruleType: AssignmentStrategyEnum.ROUND_ROBIN,
          priority: 1,
          isActive: true,
        }),
      ]);
      teamRepo.findTeamMembers.mockResolvedValue([member1, member2]);

      const agent1 = new AgentProfile(agent1Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 1',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 5.0,
        timezone: 'UTC',
      });
      const agent2 = new AgentProfile(agent2Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 2',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 5.0,
        timezone: 'UTC',
      });

      const now = Date.now();
      const availability1 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent1Id,
        status: 'ONLINE',
        lastSeenAt: new Date(now - 10000), // seen earlier
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });
      const availability2 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent2Id,
        status: 'ONLINE',
        lastSeenAt: new Date(now),
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });

      profileRepo.findById.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(agent1);
        if (id === agent2Id) return Promise.resolve(agent2);
        return Promise.resolve(null);
      });
      availabilityRepo.findByAgentProfileId.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(availability1);
        if (id === agent2Id) return Promise.resolve(availability2);
        return Promise.resolve(null);
      });

      // Round Robin selects agent seen longest time ago (agent1)
      const assigned = await service.assignEntity(
        tenantId,
        teamId,
        entityId,
        'CONVERSATION',
      );
      expect(assigned).toBe(agent1Id);
    });

    it('should route using LEAST_LOADED strategy', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team A',
        priority: 1,
        isActive: true,
      });
      const agent1Id = randomUUID();
      const agent2Id = randomUUID();
      const member1 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent1Id,
        role: 'MEMBER',
        isPrimary: false,
      });
      const member2 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent2Id,
        role: 'MEMBER',
        isPrimary: false,
      });

      teamRepo.findById.mockResolvedValue(team);
      teamRepo.findRules.mockResolvedValue([
        new AssignmentRule(randomUUID(), {
          tenantId,
          teamId,
          ruleType: AssignmentStrategyEnum.LEAST_LOADED,
          priority: 1,
          isActive: true,
        }),
      ]);
      teamRepo.findTeamMembers.mockResolvedValue([member1, member2]);

      const agent1 = new AgentProfile(agent1Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 1',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 5.0,
        timezone: 'UTC',
      });
      const agent2 = new AgentProfile(agent2Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 2',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 5.0,
        timezone: 'UTC',
      });

      const availability1 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent1Id,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 5, // higher load
        activeConversations: 2,
        activeTickets: 3,
      });
      const availability2 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent2Id,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 2, // lower load
        activeConversations: 1,
        activeTickets: 1,
      });

      profileRepo.findById.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(agent1);
        if (id === agent2Id) return Promise.resolve(agent2);
        return Promise.resolve(null);
      });
      availabilityRepo.findByAgentProfileId.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(availability1);
        if (id === agent2Id) return Promise.resolve(availability2);
        return Promise.resolve(null);
      });

      const assigned = await service.assignEntity(
        tenantId,
        teamId,
        entityId,
        'CONVERSATION',
      );
      expect(assigned).toBe(agent2Id);
    });

    it('should route using SKILL_BASED strategy', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team A',
        priority: 1,
        isActive: true,
      });
      const agent1Id = randomUUID();
      const agent2Id = randomUUID();
      const member1 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent1Id,
        role: 'MEMBER',
        isPrimary: false,
      });
      const member2 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent2Id,
        role: 'MEMBER',
        isPrimary: false,
      });

      teamRepo.findById.mockResolvedValue(team);
      teamRepo.findRules.mockResolvedValue([
        new AssignmentRule(randomUUID(), {
          tenantId,
          teamId,
          ruleType: AssignmentStrategyEnum.SKILL_BASED,
          priority: 1,
          isActive: true,
        }),
      ]);
      teamRepo.findTeamMembers.mockResolvedValue([member1, member2]);

      const agent1 = new AgentProfile(agent1Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 1',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 4.0, // lower skill
        timezone: 'UTC',
      });
      const agent2 = new AgentProfile(agent2Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 2',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 9.5, // higher skill
        timezone: 'UTC',
      });

      const availability1 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent1Id,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });
      const availability2 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent2Id,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });

      profileRepo.findById.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(agent1);
        if (id === agent2Id) return Promise.resolve(agent2);
        return Promise.resolve(null);
      });
      availabilityRepo.findByAgentProfileId.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(availability1);
        if (id === agent2Id) return Promise.resolve(availability2);
        return Promise.resolve(null);
      });

      const assigned = await service.assignEntity(
        tenantId,
        teamId,
        entityId,
        'CONVERSATION',
        { requiredSkill: 8.0 },
      );
      expect(assigned).toBe(agent2Id);
    });

    it('should route using PRIORITY_BASED strategy', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team A',
        priority: 1,
        isActive: true,
      });
      const agent1Id = randomUUID();
      const agent2Id = randomUUID();
      const member1 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent1Id,
        role: 'MEMBER',
        isPrimary: false,
      });
      const member2 = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId: agent2Id,
        role: 'MEMBER',
        isPrimary: false,
      });

      teamRepo.findById.mockResolvedValue(team);
      teamRepo.findRules.mockResolvedValue([
        new AssignmentRule(randomUUID(), {
          tenantId,
          teamId,
          ruleType: AssignmentStrategyEnum.PRIORITY_BASED,
          priority: 1,
          isActive: true,
        }),
      ]);
      teamRepo.findTeamMembers.mockResolvedValue([member1, member2]);

      const agent1 = new AgentProfile(agent1Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 1',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 9.0, // high skill
        timezone: 'UTC',
      });
      const agent2 = new AgentProfile(agent2Id, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent 2',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({
          capacity: 10,
          maxConcurrentConversations: 5,
          maxOpenTickets: 20,
        }),
        skillScore: 5.0, // lower skill
        timezone: 'UTC',
      });

      const availability1 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent1Id,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 1,
        activeConversations: 1,
        activeTickets: 0,
      });
      const availability2 = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId: agent2Id,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 1,
        activeConversations: 1,
        activeTickets: 0,
      });

      profileRepo.findById.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(agent1);
        if (id === agent2Id) return Promise.resolve(agent2);
        return Promise.resolve(null);
      });
      availabilityRepo.findByAgentProfileId.mockImplementation((id: string) => {
        if (id === agent1Id) return Promise.resolve(availability1);
        if (id === agent2Id) return Promise.resolve(availability2);
        return Promise.resolve(null);
      });

      // Priority strategy prioritizes high skill score, then lower currentLoad
      const assigned = await service.assignEntity(
        tenantId,
        teamId,
        entityId,
        'TICKET',
      );
      expect(assigned).toBe(agent1Id);
    });
  });
});
