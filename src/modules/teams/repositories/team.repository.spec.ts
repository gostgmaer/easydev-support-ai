import { DrizzleTeamRepository } from './drizzle-team.repository';
import { DrizzleAgentProfileRepository } from './drizzle-agent-profile.repository';
import { DrizzleAgentAvailabilityRepository } from './drizzle-agent-availability.repository';
import { db } from '@easydev/database';
import { Team } from '../domain/team.aggregate';
import { TeamMember } from '../domain/team-member.entity';
import { AgentProfile } from '../domain/agent-profile.entity';
import { AgentAvailability } from '../domain/agent-availability.entity';
import { AgentCapacity, AssignmentStrategyEnum } from '../domain/value-objects';
import { AssignmentRule } from '../domain/assignment-rule.entity';
import { randomUUID } from 'crypto';

let mockResults: any[] = [];

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  then: jest.fn((resolve) => {
    const res = mockResults.length > 0 ? mockResults.shift() : [];
    resolve(res);
  }),
};

jest.mock('@easydev/database', () => {
  return {
    db: {
      select: jest.fn(() => queryBuilder),
      insert: jest.fn(() => queryBuilder),
      update: jest.fn(() => queryBuilder),
      delete: jest.fn(() => queryBuilder),
      transaction: jest.fn((cb) => cb(queryBuilder)),
    },
    schema: {
      teams: { id: 'teams.id', tenantId: 'teams.tenant_id', name: 'teams.name', deletedAt: 'teams.deleted_at', department: 'teams.department', createdAt: 'teams.created_at' },
      teamMembers: { id: 'team_members.id', tenantId: 'team_members.tenant_id', teamId: 'team_members.team_id', agentProfileId: 'team_members.agent_profile_id' },
      agentProfiles: { id: 'agent_profiles.id', tenantId: 'agent_profiles.tenant_id', userId: 'agent_profiles.user_id', deletedAt: 'agent_profiles.deleted_at', displayName: 'agent_profiles.display_name', status: 'agent_profiles.status', createdAt: 'agent_profiles.created_at', employeeCode: 'agent_profiles.employee_code' },
      assignmentRules: { id: 'assignment_rules.id', tenantId: 'assignment_rules.tenant_id', teamId: 'assignment_rules.team_id' },
      agentAvailability: { id: 'agent_availability.id', tenantId: 'agent_availability.tenant_id', agentProfileId: 'agent_availability.agent_profile_id', status: 'agent_availability.status', currentLoad: 'agent_availability.current_load', activeConversations: 'agent_availability.active_conversations', activeTickets: 'agent_availability.active_tickets' },
    },
  };
});

describe('Team Module Repositories', () => {
  let teamRepo: DrizzleTeamRepository;
  let profileRepo: DrizzleAgentProfileRepository;
  let availabilityRepo: DrizzleAgentAvailabilityRepository;

  const tenantId = randomUUID();

  beforeEach(() => {
    teamRepo = new DrizzleTeamRepository();
    profileRepo = new DrizzleAgentProfileRepository();
    availabilityRepo = new DrizzleAgentAvailabilityRepository();
    mockResults = [];
    jest.clearAllMocks();
  });

  describe('DrizzleTeamRepository', () => {
    const teamId = randomUUID();

    it('should findById and return null if no team exists', async () => {
      mockResults.push([]);

      const result = await teamRepo.findById(teamId, tenantId);
      expect(result).toBeNull();
    });

    it('should findById and return mapped Team if team exists', async () => {
      mockResults.push(
        [{ id: teamId, tenantId, name: 'Tier 1 Support', isActive: true }], // rawTeam
        [], // rawMembers
        [] // rawRules
      );

      const result = await teamRepo.findById(teamId, tenantId);
      expect(result).toBeDefined();
      expect(result?.name).toBe('Tier 1 Support');
    });

    it('should findByName and return Team if found', async () => {
      mockResults.push(
        [{ id: teamId, tenantId, name: 'Tier 1 Support', isActive: true }],
        [],
        []
      );

      const result = await teamRepo.findByName('Tier 1 Support', tenantId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(teamId);
    });

    it('should return null for findByName if not found', async () => {
      mockResults.push([]);

      const result = await teamRepo.findByName('Tier 1 Support', tenantId);
      expect(result).toBeNull();
    });

    it('should findAll teams for a tenant', async () => {
      mockResults.push(
        [{ id: teamId, tenantId, name: 'Team A' }],
        [], // members for Team A
        [] // rules for Team A
      );

      const result = await teamRepo.findAll(tenantId);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Team A');
    });

    it('should findPaginated teams with options', async () => {
      mockResults.push(
        [{ id: teamId, tenantId, name: 'Team A', department: 'Eng' }], // teams rows
        [{ count: 1 }], // count query
        [], // members for Team A
        [] // rules for Team A
      );

      const result = await teamRepo.findPaginated(tenantId, {
        page: 1,
        limit: 10,
        department: 'Eng',
        search: 'Team',
        sortOrder: 'DESC',
      });

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should save a new team aggregate within transaction', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Tier 1 Support',
        priority: 1,
        isActive: true,
      });
      team.addMember(new TeamMember(randomUUID(), { tenantId, teamId, agentProfileId: 'a1', role: 'MEMBER', isPrimary: false }));
      team.addRule(new AssignmentRule(randomUUID(), { tenantId, teamId, ruleType: AssignmentStrategyEnum.ROUND_ROBIN, priority: 1, isActive: true }));

      mockResults.push([]); // select existing -> empty

      const result = await teamRepo.save(team, tenantId);
      expect(result).toBe(team);
      expect(queryBuilder.insert).toHaveBeenCalled();
    });

    it('should save/update existing team aggregate', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Tier 1 Support',
        priority: 1,
        isActive: true,
      });

      mockResults.push([{ id: teamId }]); // select existing -> found

      const result = await teamRepo.save(team, tenantId);
      expect(result).toBe(team);
      expect(queryBuilder.update).toHaveBeenCalled();
    });

    it('should delete a team by setting deletedAt', async () => {
      mockResults.push([{ id: teamId }]); // existing

      const result = await teamRepo.delete(teamId, tenantId);
      expect(result).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return false when deleting non-existent team', async () => {
      mockResults.push([]); // not existing

      const result = await teamRepo.delete(teamId, tenantId);
      expect(result).toBe(false);
    });

    it('should add team member if not exists', async () => {
      const member = new TeamMember(randomUUID(), { tenantId, teamId, agentProfileId: 'a1', role: 'MEMBER', isPrimary: false });
      mockResults.push([]); // not existing

      await teamRepo.addMember(member, tenantId);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should remove team member', async () => {
      await teamRepo.removeMember(teamId, 'a1', tenantId);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should findTeamMembers', async () => {
      mockResults.push([{ id: 'm1', tenantId, teamId, agentProfileId: 'a1', role: 'MEMBER', isPrimary: true }]);

      const members = await teamRepo.findTeamMembers(teamId, tenantId);
      expect(members.length).toBe(1);
      expect(members[0].agentProfileId).toBe('a1');
    });

    it('should saveRule (insert new or update existing)', async () => {
      const rule = new AssignmentRule(randomUUID(), { tenantId, teamId, ruleType: AssignmentStrategyEnum.ROUND_ROBIN, priority: 1, isActive: true });

      // test insert
      mockResults.push([]);
      await teamRepo.saveRule(rule, tenantId);
      expect(db.insert).toHaveBeenCalled();

      // test update
      mockResults.push([{ id: rule.id }]);
      await teamRepo.saveRule(rule, tenantId);
      expect(db.update).toHaveBeenCalled();
    });

    it('should findRules and deleteRule', async () => {
      mockResults.push([{ id: 'r1', tenantId, teamId, ruleType: 'ROUND_ROBIN', priority: 1, isActive: true }]);

      const rules = await teamRepo.findRules(teamId, tenantId);
      expect(rules.length).toBe(1);
      expect(rules[0].ruleType).toBe('ROUND_ROBIN');

      await teamRepo.deleteRule('r1', tenantId);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('DrizzleAgentProfileRepository', () => {
    const profileId = randomUUID();

    it('should findById and return null if no profile exists', async () => {
      mockResults.push([]);

      const result = await profileRepo.findById(profileId, tenantId);
      expect(result).toBeNull();
    });

    it('should findByUserId and findByEmployeeCode', async () => {
      mockResults.push([{ id: profileId, tenantId, userId: 'u1', displayName: 'Agent', capacity: 10 }]);
      const p1 = await profileRepo.findByUserId('u1', tenantId);
      expect(p1).toBeDefined();

      mockResults.push([{ id: profileId, tenantId, userId: 'u1', displayName: 'Agent', capacity: 10 }]);
      const p2 = await profileRepo.findByEmployeeCode('E101', tenantId);
      expect(p2).toBeDefined();
    });

    it('should findAll and findPaginated profiles', async () => {
      mockResults.push([{ id: profileId, tenantId, userId: 'u1', displayName: 'Agent', capacity: 10 }]);
      const all = await profileRepo.findAll(tenantId);
      expect(all.length).toBe(1);

      mockResults.push(
        [{ id: profileId, tenantId, userId: 'u1', displayName: 'Agent', capacity: 10 }],
        [{ count: 1 }]
      );
      const paginated = await profileRepo.findPaginated(tenantId, {
        page: 1,
        limit: 10,
        search: 'Agent',
        status: 'ACTIVE',
      });
      expect(paginated.data.length).toBe(1);
      expect(paginated.total).toBe(1);
    });

    it('should save/insert new agent profile successfully, and update existing', async () => {
      const profile = new AgentProfile(profileId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'John Doe',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 }),
        skillScore: 5.0,
        timezone: 'UTC',
      });

      mockResults.push([]); // select existing -> empty
      await profileRepo.save(profile, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: profileId }]); // select existing -> found
      await profileRepo.save(profile, tenantId);
      expect(db.update).toHaveBeenCalled();
    });

    it('should soft delete agent profile', async () => {
      mockResults.push([{ id: profileId }]); // existing
      const res = await profileRepo.delete(profileId, tenantId);
      expect(res).toBe(true);

      mockResults.push([]); // non-existing
      const res2 = await profileRepo.delete(profileId, tenantId);
      expect(res2).toBe(false);
    });
  });

  describe('DrizzleAgentAvailabilityRepository', () => {
    const availabilityId = randomUUID();
    const profileId = randomUUID();

    it('should findByAgentProfileId and return null if not found', async () => {
      mockResults.push([]);

      const result = await availabilityRepo.findByAgentProfileId(profileId, tenantId);
      expect(result).toBeNull();
    });

    it('should findById, findOnlineAgents, and findAll', async () => {
      mockResults.push([{ id: availabilityId, tenantId, agentProfileId: profileId, status: 'ONLINE' }]);
      const av = await availabilityRepo.findById(availabilityId, tenantId);
      expect(av).toBeDefined();

      mockResults.push([{ id: availabilityId, tenantId, agentProfileId: profileId, status: 'ONLINE' }]);
      const online = await availabilityRepo.findOnlineAgents(tenantId);
      expect(online.length).toBe(1);

      mockResults.push([{ id: availabilityId, tenantId, agentProfileId: profileId, status: 'ONLINE' }]);
      const all = await availabilityRepo.findAll(tenantId);
      expect(all.length).toBe(1);
    });

    it('should save new availability successfully, and update existing', async () => {
      const availability = new AgentAvailability(availabilityId, {
        tenantId,
        agentProfileId: profileId,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });

      mockResults.push([]); // not existing
      await availabilityRepo.save(availability, tenantId);
      expect(db.insert).toHaveBeenCalled();

      mockResults.push([{ id: availabilityId }]); // existing
      await availabilityRepo.save(availability, tenantId);
      expect(db.update).toHaveBeenCalled();
    });

    it('should delete availability', async () => {
      mockResults.push([{ id: availabilityId }]); // existing
      const res = await availabilityRepo.delete(availabilityId, tenantId);
      expect(res).toBe(true);

      mockResults.push([]); // non-existing
      const res2 = await availabilityRepo.delete(availabilityId, tenantId);
      expect(res2).toBe(false);
    });

    it('should update load and update counters', async () => {
      await availabilityRepo.updateLoad(profileId, 5, tenantId);
      expect(db.update).toHaveBeenCalled();

      await availabilityRepo.updateCounters(profileId, 2, 1, tenantId);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
