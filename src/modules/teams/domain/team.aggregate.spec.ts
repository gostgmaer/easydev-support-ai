import { Team } from './team.aggregate';
import { TeamMember } from './team-member.entity';
import { AssignmentRule } from './assignment-rule.entity';
import {
  TeamId,
  AgentId,
  AssignmentStrategy,
  AssignmentStrategyEnum,
  Department,
  AgentCapacity,
} from './value-objects';
import { randomUUID } from 'crypto';

describe('Team DDD Domain Model', () => {
  const tenantId = randomUUID();

  describe('Value Objects', () => {
    it('should validate TeamId and AgentId UUID format', () => {
      expect(() => TeamId.create('invalid-uuid')).toThrow();
      expect(TeamId.create(randomUUID()).value).toBeDefined();

      expect(() => AgentId.create('invalid-uuid')).toThrow();
      expect(AgentId.create(randomUUID()).value).toBeDefined();
    });

    it('should validate assignment strategy type', () => {
      expect(() => AssignmentStrategy.create('UNKNOWN' as any)).toThrow();
      expect(AssignmentStrategy.create(AssignmentStrategyEnum.ROUND_ROBIN).value).toBe(AssignmentStrategyEnum.ROUND_ROBIN);
    });

    it('should validate department length', () => {
      expect(() => Department.create('a'.repeat(150))).toThrow();
      expect(Department.create('Customer Success').value).toBe('Customer Success');
    });

    it('should validate capacity values', () => {
      expect(() => AgentCapacity.create({ capacity: -1, maxConcurrentConversations: 5, maxOpenTickets: 20 })).toThrow();
      const cap = AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 });
      expect(cap.capacity).toBe(10);
    });
  });

  describe('Team Aggregate Root', () => {
    it('should create team aggregate and append team.created event', () => {
      const teamId = randomUUID();
      const team = Team.create(teamId, {
        tenantId,
        name: 'Support Tier 1',
        department: 'Support',
        priority: 1,
        isActive: true,
      });

      expect(team.id).toBe(teamId);
      expect(team.name).toBe('Support Tier 1');
      expect(team.domainEvents.length).toBe(1);
      expect((team.domainEvents[0] as any).constructor.eventName).toBe('team.created');
    });

    it('should add team members and append agent.assigned event', () => {
      const team = Team.create(randomUUID(), {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });

      team.clearEvents();

      const memberId = randomUUID();
      const agentProfileId = randomUUID();
      const member = new TeamMember(memberId, {
        tenantId,
        teamId: team.id,
        agentProfileId,
        role: 'MEMBER',
        isPrimary: false,
      });

      team.addMember(member);

      expect(team.members.length).toBe(1);
      expect(team.members[0].agentProfileId).toBe(agentProfileId);
      expect((team.domainEvents[0] as any).constructor.eventName).toBe('agent.assigned');
    });

    it('should move team members and append agent.transferred event', () => {
      const team = Team.create(randomUUID(), {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });

      const agentProfileId = randomUUID();
      const member = new TeamMember(randomUUID(), {
        tenantId,
        teamId: team.id,
        agentProfileId,
        role: 'MEMBER',
        isPrimary: false,
      });

      team.addMember(member);
      team.clearEvents();

      const destinationTeamId = randomUUID();
      team.moveMember(agentProfileId, team.id, destinationTeamId);

      expect(team.members.length).toBe(0);
      expect((team.domainEvents[0] as any).constructor.eventName).toBe('agent.transferred');
    });

    it('should archive team and append team.archived event', () => {
      const team = Team.create(randomUUID(), {
        tenantId,
        name: 'Support Tier 1',
        priority: 1,
        isActive: true,
      });

      team.clearEvents();
      team.archive();

      expect(team.isActive).toBe(false);
      expect(team.deletedAt).toBeDefined();
      expect((team.domainEvents[0] as any).constructor.eventName).toBe('team.archived');
    });
  });
});
