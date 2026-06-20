import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from './team.service';
import { TeamEventPublisher } from './team-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { Team } from '../domain/team.aggregate';
import { TeamMember } from '../domain/team-member.entity';
import { AgentProfile } from '../domain/agent-profile.entity';
import { AgentCapacity } from '../domain/value-objects';
import { CreateTeamDto, UpdateTeamDto, TeamQueryDto } from '../dtos';
import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('TeamService', () => {
  let service: TeamService;
  let teamRepo: any;
  let profileRepo: any;
  let publisher: any;
  let audit: any;

  const mockTeamRepo = {
    findById: jest.fn(),
    findByName: jest.fn(),
    findPaginated: jest.fn(),
    save: jest.fn((t) => Promise.resolve(t)),
    findTeamMembers: jest.fn(),
    findRules: jest.fn(),
  };

  const mockProfileRepo = {
    findById: jest.fn(),
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
        TeamService,
        { provide: 'ITeamRepository', useValue: mockTeamRepo },
        { provide: 'IAgentProfileRepository', useValue: mockProfileRepo },
        { provide: TeamEventPublisher, useValue: mockEventPublisher },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    teamRepo = module.get('ITeamRepository');
    profileRepo = module.get('IAgentProfileRepository');
    publisher = module.get(TeamEventPublisher);
    audit = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = randomUUID();
    const dto: CreateTeamDto = {
      name: 'Support Tier 1',
      description: 'First level support',
      department: 'Support',
      priority: 1,
      isActive: true,
    };

    it('should create team when name does not exist', async () => {
      teamRepo.findByName.mockResolvedValue(null);

      const result = await service.create(tenantId, dto, 'user-123');

      expect(result).toBeDefined();
      expect(result.name).toBe('Support Tier 1');
      expect(teamRepo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEAM_CREATE',
        })
      );
    });

    it('should throw ConflictException when team name exists', async () => {
      teamRepo.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(tenantId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();

    it('should update team properties successfully', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      teamRepo.findById.mockResolvedValue(team);

      const dto: UpdateTeamDto = {
        name: 'Support Tier 1 Updated',
        priority: 2,
      };

      const result = await service.update(tenantId, teamId, dto, 'user-123');

      expect(result.name).toBe('Support Tier 1 Updated');
      expect(result.priority).toBe(2);
      expect(teamRepo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEAM_UPDATE',
        })
      );
    });

    it('should throw NotFoundException if team does not exist', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(service.update(tenantId, teamId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();

    it('should archive team successfully', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      teamRepo.findById.mockResolvedValue(team);

      const archived = await service.archive(tenantId, teamId, 'user-123');

      expect(archived).toBe(true);
      expect(team.isActive).toBe(false);
      expect(teamRepo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEAM_ARCHIVE',
        })
      );
    });

    it('should throw NotFoundException if team does not exist', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(service.archive(tenantId, teamId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addAgent', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();
    const agentProfileId = randomUUID();

    it('should add agent to team successfully', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      const agent = new AgentProfile(agentProfileId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'Agent Agent',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 }),
        skillScore: 5.0,
        timezone: 'UTC',
      });

      teamRepo.findById.mockResolvedValue(team);
      profileRepo.findById.mockResolvedValue(agent);

      await service.addAgent(tenantId, teamId, agentProfileId, 'MEMBER', 'user-123');

      expect(team.members.length).toBe(1);
      expect(team.members[0].agentProfileId).toBe(agentProfileId);
      expect(teamRepo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEAM_MEMBER_ADD',
        })
      );
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(service.addAgent(tenantId, teamId, agentProfileId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if agent profile not found', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      teamRepo.findById.mockResolvedValue(team);
      profileRepo.findById.mockResolvedValue(null);

      await expect(service.addAgent(tenantId, teamId, agentProfileId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAgent', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();
    const agentProfileId = randomUUID();

    it('should remove agent from team successfully', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      const member = new TeamMember(randomUUID(), {
        tenantId,
        teamId,
        agentProfileId,
        role: 'MEMBER',
        isPrimary: false,
      });
      team.addMember(member);

      teamRepo.findById.mockResolvedValue(team);

      await service.removeAgent(tenantId, teamId, agentProfileId, 'user-123');

      expect(team.members.length).toBe(0);
      expect(teamRepo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEAM_MEMBER_REMOVE',
        })
      );
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(service.removeAgent(tenantId, teamId, agentProfileId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveAgent', () => {
    const tenantId = randomUUID();
    const fromTeamId = randomUUID();
    const toTeamId = randomUUID();
    const agentProfileId = randomUUID();

    it('should move agent from one team to another successfully', async () => {
      const fromTeam = Team.create(fromTeamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      const toTeam = Team.create(toTeamId, {
        tenantId,
        name: 'Support Tier 2',
        priority: 2,
        isActive: true,
      });
      const member = new TeamMember(randomUUID(), {
        tenantId,
        teamId: fromTeamId,
        agentProfileId,
        role: 'MEMBER',
        isPrimary: false,
      });
      fromTeam.addMember(member);

      teamRepo.findById.mockImplementation((id: string) => {
        if (id === fromTeamId) return Promise.resolve(fromTeam);
        if (id === toTeamId) return Promise.resolve(toTeam);
        return Promise.resolve(null);
      });

      await service.moveAgent(tenantId, fromTeamId, toTeamId, agentProfileId, 'user-123');

      expect(fromTeam.members.length).toBe(0);
      expect(toTeam.members.length).toBe(1);
      expect(teamRepo.save).toHaveBeenCalledTimes(2);
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEAM_MEMBER_MOVE',
        })
      );
    });

    it('should throw NotFoundException if either team is missing', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(service.moveAgent(tenantId, fromTeamId, toTeamId, agentProfileId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById & findPaginated', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();

    it('should retrieve team by ID', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });
      teamRepo.findById.mockResolvedValue(team);

      const result = await service.findById(tenantId, teamId);
      expect(result).toBe(team);
    });

    it('should throw NotFoundException if team not found on findById', async () => {
      teamRepo.findById.mockResolvedValue(null);
      await expect(service.findById(tenantId, teamId)).rejects.toThrow(NotFoundException);
    });

    it('should call repository findPaginated', async () => {
      const query: TeamQueryDto = { page: 1, limit: 10 };
      teamRepo.findPaginated.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findPaginated(tenantId, query);
      expect(result).toEqual({ data: [], total: 0 });
      expect(teamRepo.findPaginated).toHaveBeenCalledWith(tenantId, query);
    });
  });
});
