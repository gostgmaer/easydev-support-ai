import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from './team.controller';
import { AgentProfileController } from './agent-profile.controller';
import { AvailabilityController } from './availability.controller';
import { AssignmentController } from './assignment.controller';
import { TeamService } from '../services/team.service';
import { AgentProfileService } from '../services/agent-profile.service';
import { AgentAvailabilityService } from '../services/agent-availability.service';
import { AgentAssignmentService } from '../services/agent-assignment.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { TenantResolver } from '@easydev/shared-kernel';
import { randomUUID } from 'crypto';
import { CreateTeamDto, UpdateTeamDto, TeamQueryDto, AssignAgentDto, AgentProfileDto, UpdateAgentProfileDto, AgentProfileQueryDto, UpdateAvailabilityDto } from '../dtos';

describe('Teams Module Controllers', () => {
  let teamController: TeamController;
  let profileController: AgentProfileController;
  let availabilityController: AvailabilityController;
  let assignmentController: AssignmentController;

  let teamService: any;
  let profileService: any;
  let availabilityService: any;
  let assignmentService: any;

  const mockTeamService = {
    create: jest.fn(),
    findPaginated: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    addAgent: jest.fn(),
    removeAgent: jest.fn(),
    moveAgent: jest.fn(),
  };

  const mockProfileService = {
    create: jest.fn(),
    findPaginated: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAvailabilityService = {
    getAvailability: jest.fn(),
    updateAvailability: jest.fn(),
  };

  const mockAssignmentService = {
    assignEntity: jest.fn(),
  };

  const tenantId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        TeamController,
        AgentProfileController,
        AvailabilityController,
        AssignmentController,
      ],
      providers: [
        TenantResolver,
        { provide: TeamService, useValue: mockTeamService },
        { provide: AgentProfileService, useValue: mockProfileService },
        { provide: AgentAvailabilityService, useValue: mockAvailabilityService },
        { provide: AgentAssignmentService, useValue: mockAssignmentService },
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    teamController = module.get<TeamController>(TeamController);
    profileController = module.get<AgentProfileController>(AgentProfileController);
    availabilityController = module.get<AvailabilityController>(AvailabilityController);
    assignmentController = module.get<AssignmentController>(AssignmentController);

    teamService = module.get<TeamService>(TeamService);
    profileService = module.get<AgentProfileService>(AgentProfileService);
    availabilityService = module.get<AgentAvailabilityService>(AgentAvailabilityService);
    assignmentService = module.get<AgentAssignmentService>(AgentAssignmentService);

    jest.clearAllMocks();
  });

  describe('TeamController', () => {
    const teamId = randomUUID();

    it('should create a team', async () => {
      const dto: CreateTeamDto = { name: 'Engineering', priority: 1 };
      mockTeamService.create.mockResolvedValue({
        toJSON: () => ({ id: teamId, name: 'Engineering' }),
      });

      const res = await teamController.create(tenantId, dto, { user: { id: 'u1' } });
      expect(res).toEqual({ id: teamId, name: 'Engineering' });
      expect(teamService.create).toHaveBeenCalledWith(tenantId, dto, 'u1');
    });

    it('should get paginated teams', async () => {
      const query: TeamQueryDto = { page: 1, limit: 10 };
      mockTeamService.findPaginated.mockResolvedValue({
        data: [{ toJSON: () => ({ id: teamId }) }],
        total: 1,
      });

      const res = await teamController.findPaginated(tenantId, query);
      expect(res.data).toEqual([{ id: teamId }]);
      expect(res.total).toBe(1);
    });

    it('should get team by id', async () => {
      mockTeamService.findById.mockResolvedValue({
        toJSON: () => ({ id: teamId, name: 'Engineering' }),
      });

      const res = await teamController.findById(tenantId, teamId);
      expect(res).toEqual({ id: teamId, name: 'Engineering' });
    });

    it('should update a team', async () => {
      const dto: UpdateTeamDto = { name: 'Support Tier 2' };
      mockTeamService.update.mockResolvedValue({
        toJSON: () => ({ id: teamId, name: 'Support Tier 2' }),
      });

      const res = await teamController.update(tenantId, teamId, dto, { user: { id: 'u1' } });
      expect(res).toEqual({ id: teamId, name: 'Support Tier 2' });
    });

    it('should archive a team', async () => {
      await teamController.archive(tenantId, teamId, { user: { id: 'u1' } });
      expect(teamService.archive).toHaveBeenCalledWith(tenantId, teamId, 'u1');
    });

    it('should add agent to a team', async () => {
      const dto: AssignAgentDto = { agentProfileId: 'a1', role: 'MEMBER' };
      const res = await teamController.addAgent(tenantId, teamId, dto, { user: { id: 'u1' } });
      expect(res).toEqual({ success: true });
      expect(teamService.addAgent).toHaveBeenCalledWith(tenantId, teamId, 'a1', 'MEMBER', 'u1');
    });

    it('should remove agent from a team', async () => {
      await teamController.removeAgent(tenantId, teamId, 'a1', { user: { id: 'u1' } });
      expect(teamService.removeAgent).toHaveBeenCalledWith(tenantId, teamId, 'a1', 'u1');
    });

    it('should transfer an agent', async () => {
      const res = await teamController.transfer(tenantId, teamId, 'team-2', 'a1', { user: { id: 'u1' } });
      expect(res).toEqual({ success: true });
      expect(teamService.moveAgent).toHaveBeenCalledWith(tenantId, teamId, 'team-2', 'a1', 'u1');
    });
  });

  describe('AgentProfileController', () => {
    const agentId = randomUUID();

    it('should create an agent profile', async () => {
      const dto: AgentProfileDto = { userId: randomUUID(), displayName: 'Agent Name' };
      mockProfileService.create.mockResolvedValue({
        toJSON: () => ({ id: agentId, displayName: 'Agent Name' }),
      });

      const res = await profileController.create(tenantId, dto, { user: { id: 'u1' } });
      expect(res).toEqual({ id: agentId, displayName: 'Agent Name' });
    });

    it('should list agent profiles with pagination', async () => {
      const query: AgentProfileQueryDto = { page: 1, limit: 10 };
      mockProfileService.findPaginated.mockResolvedValue({
        data: [{ toJSON: () => ({ id: agentId }) }],
        total: 1,
      });

      const res = await profileController.findPaginated(tenantId, query);
      expect(res.data).toEqual([{ id: agentId }]);
      expect(res.total).toBe(1);
    });

    it('should get an agent profile by id', async () => {
      mockProfileService.findById.mockResolvedValue({
        toJSON: () => ({ id: agentId, displayName: 'Agent Name' }),
      });

      const res = await profileController.findById(tenantId, agentId);
      expect(res).toEqual({ id: agentId, displayName: 'Agent Name' });
    });

    it('should update an agent profile', async () => {
      const dto: UpdateAgentProfileDto = { displayName: 'New Name' };
      mockProfileService.update.mockResolvedValue({
        toJSON: () => ({ id: agentId, displayName: 'New Name' }),
      });

      const res = await profileController.update(tenantId, agentId, dto, { user: { id: 'u1' } });
      expect(res).toEqual({ id: agentId, displayName: 'New Name' });
    });

    it('should delete an agent profile', async () => {
      await profileController.delete(tenantId, agentId, { user: { id: 'u1' } });
      expect(profileService.delete).toHaveBeenCalledWith(tenantId, agentId, 'u1');
    });
  });

  describe('AvailabilityController', () => {
    const agentId = randomUUID();

    it('should get agent availability', async () => {
      mockAvailabilityService.getAvailability.mockResolvedValue({
        toJSON: () => ({ id: 'av1', agentProfileId: agentId, status: 'ONLINE' }),
      });

      const res = await availabilityController.getAvailability(tenantId, agentId);
      expect(res).toEqual({ id: 'av1', agentProfileId: agentId, status: 'ONLINE' });
    });

    it('should update agent availability', async () => {
      const dto: UpdateAvailabilityDto = { status: 'ONLINE' };
      mockAvailabilityService.updateAvailability.mockResolvedValue({
        toJSON: () => ({ id: 'av1', agentProfileId: agentId, status: 'ONLINE' }),
      });

      const res = await availabilityController.updateAvailability(tenantId, agentId, dto, { user: { id: 'u1' } });
      expect(res).toEqual({ id: 'av1', agentProfileId: agentId, status: 'ONLINE' });
    });
  });

  describe('AssignmentController', () => {
    it('should trigger routing assignment', async () => {
      const teamId = randomUUID();
      const entityId = randomUUID();
      mockAssignmentService.assignEntity.mockResolvedValue('a1');

      const res = await assignmentController.assign(tenantId, teamId, entityId, 'CONVERSATION', { requiredSkill: 5 });
      expect(res).toEqual({ assignedAgentId: 'a1', success: true });
      expect(assignmentService.assignEntity).toHaveBeenCalledWith(tenantId, teamId, entityId, 'CONVERSATION', { requiredSkill: 5 });
    });
  });
});
