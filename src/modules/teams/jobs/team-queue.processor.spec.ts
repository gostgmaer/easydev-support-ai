import { Test, TestingModule } from '@nestjs/testing';
import { TeamQueueProcessor } from './team-queue.processor';
import { AgentAssignmentService } from '../services/agent-assignment.service';
import { AgentAvailabilityService } from '../services/agent-availability.service';
import { AgentProfileService } from '../services/agent-profile.service';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';

describe('TeamQueueProcessor', () => {
  let processor: TeamQueueProcessor;
  let assignmentService: any;
  let availabilityService: any;
  let profileService: any;

  const mockAssignmentService = {
    assignEntity: jest.fn(),
  };

  const mockAvailabilityService = {
    getAvailability: jest.fn(),
    updateAvailability: jest.fn(),
    updateLoad: jest.fn(),
  };

  const mockProfileService = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamQueueProcessor,
        { provide: AgentAssignmentService, useValue: mockAssignmentService },
        { provide: AgentAvailabilityService, useValue: mockAvailabilityService },
        { provide: AgentProfileService, useValue: mockProfileService },
      ],
    }).compile();

    processor = module.get<TeamQueueProcessor>(TeamQueueProcessor);
    assignmentService = module.get<AgentAssignmentService>(AgentAssignmentService);
    availabilityService = module.get<AgentAvailabilityService>(AgentAvailabilityService);
    profileService = module.get<AgentProfileService>(AgentProfileService);

    jest.clearAllMocks();
  });

  describe('handleJob', () => {
    const tenantId = randomUUID();

    it('should handle assignment-job', async () => {
      const job: Partial<Job> = {
        name: 'assignment-job',
        id: 'job-1',
        data: {
          teamId: 'team-1',
          entityId: 'entity-1',
          entityType: 'CONVERSATION',
          options: { requiredSkill: 5 },
          _tenantContext: { tenantId },
        },
      };

      mockAssignmentService.assignEntity.mockResolvedValue('agent-1');

      const res = await processor.handleJob(job as any);

      expect(res).toBe('agent-1');
      expect(assignmentService.assignEntity).toHaveBeenCalledWith(
        tenantId,
        'team-1',
        'entity-1',
        'CONVERSATION',
        { requiredSkill: 5 }
      );
    });

    it('should handle availability-sync-job and update idle status to AWAY', async () => {
      const job: Partial<Job> = {
        name: 'availability-sync-job',
        id: 'job-2',
        data: {
          agentProfileId: 'agent-1',
          _tenantContext: { tenantId },
        },
      };

      const now = new Date();
      // lastSeenAt is 20 minutes ago
      const lastSeenAt = new Date(now.getTime() - 20 * 60 * 1000);

      mockAvailabilityService.getAvailability.mockResolvedValue({
        agentProfileId: 'agent-1',
        status: 'ONLINE',
        lastSeenAt,
      });

      const res = await processor.handleJob(job as any);

      expect(res).toEqual({ status: 'synced' });
      expect(availabilityService.updateAvailability).toHaveBeenCalledWith(tenantId, 'agent-1', {
        status: 'AWAY',
      });
    });

    it('should handle load-balancer-job and align load differences', async () => {
      const job: Partial<Job> = {
        name: 'load-balancer-job',
        id: 'job-3',
        data: {
          agentProfileId: 'agent-1',
          _tenantContext: { tenantId },
        },
      };

      mockAvailabilityService.getAvailability.mockResolvedValue({
        agentProfileId: 'agent-1',
        activeConversations: 2,
        activeTickets: 3,
        currentLoad: 1, // out of sync
      });

      const res = await processor.handleJob(job as any);

      expect(res).toEqual({ actualLoad: 5 });
      expect(availabilityService.updateLoad).toHaveBeenCalledWith(tenantId, 'agent-1', 4);
    });

    it('should handle capacity-calculation-job', async () => {
      const job: Partial<Job> = {
        name: 'capacity-calculation-job',
        id: 'job-4',
        data: {
          agentProfileId: 'agent-1',
          newCapacity: 15,
          _tenantContext: { tenantId },
        },
      };

      mockProfileService.findById.mockResolvedValue({
        id: 'agent-1',
        capacity: { capacity: 10 },
      });

      const res = await processor.handleJob(job as any);

      expect(res).toEqual({ status: 'success' });
      expect(profileService.update).toHaveBeenCalledWith(tenantId, 'agent-1', {
        capacity: 15,
      });
    });

    it('should throw error for unknown job', async () => {
      const job: Partial<Job> = {
        name: 'unknown-job',
        id: 'job-5',
        data: {
          _tenantContext: { tenantId },
        },
      };

      await expect(processor.handleJob(job as any)).rejects.toThrow('Unknown job name: unknown-job');
    });
  });
});
