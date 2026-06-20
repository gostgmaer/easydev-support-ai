import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentRuleService } from './assignment-rule.service';
import { Team } from '../domain/team.aggregate';
import { AssignmentStrategyEnum } from '../domain/value-objects';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';

describe('AssignmentRuleService', () => {
  let service: AssignmentRuleService;
  let teamRepo: any;

  const mockTeamRepo = {
    findById: jest.fn(),
    save: jest.fn((t) => Promise.resolve(t)),
    findRules: jest.fn(),
    deleteRule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentRuleService,
        { provide: 'ITeamRepository', useValue: mockTeamRepo },
      ],
    }).compile();

    service = module.get<AssignmentRuleService>(AssignmentRuleService);
    teamRepo = module.get('ITeamRepository');

    jest.clearAllMocks();
  });

  describe('createRule', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();

    it('should create and add rule to team successfully', async () => {
      const team = Team.create(teamId, {
        tenantId,
        name: 'Team 1',
        priority: 1,
        isActive: true,
      });
      teamRepo.findById.mockResolvedValue(team);

      const rule = await service.createRule(
        tenantId,
        teamId,
        AssignmentStrategyEnum.SKILL_BASED,
        1,
        { minSkill: 5 },
      );

      expect(rule).toBeDefined();
      expect(rule.ruleType).toBe(AssignmentStrategyEnum.SKILL_BASED);
      expect(rule.priority).toBe(1);
      expect(team.rules.length).toBe(1);
      expect(teamRepo.save).toHaveBeenCalledWith(team, tenantId);
    });

    it('should throw NotFoundException if team does not exist', async () => {
      teamRepo.findById.mockResolvedValue(null);

      await expect(
        service.createRule(
          tenantId,
          teamId,
          AssignmentStrategyEnum.SKILL_BASED,
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findRules & deleteRule', () => {
    const tenantId = randomUUID();
    const teamId = randomUUID();
    const ruleId = randomUUID();

    it('should call repository findRules', async () => {
      teamRepo.findRules.mockResolvedValue([]);
      const res = await service.findRules(tenantId, teamId);
      expect(res).toEqual([]);
      expect(teamRepo.findRules).toHaveBeenCalledWith(teamId, tenantId);
    });

    it('should call repository deleteRule', async () => {
      await service.deleteRule(tenantId, ruleId);
      expect(teamRepo.deleteRule).toHaveBeenCalledWith(ruleId, tenantId);
    });
  });
});
