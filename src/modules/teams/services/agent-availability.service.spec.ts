import { Test, TestingModule } from '@nestjs/testing';
import { AgentAvailabilityService } from './agent-availability.service';
import { TeamEventPublisher } from './team-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { AgentAvailability } from '../domain/agent-availability.entity';
import { UpdateAvailabilityDto } from '../dtos';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';

describe('AgentAvailabilityService', () => {
  let service: AgentAvailabilityService;
  let availabilityRepo: any;
  let publisher: any;
  let audit: any;

  const mockAvailabilityRepo = {
    findByAgentProfileId: jest.fn(),
    save: jest.fn((a) => Promise.resolve(a)),
    updateLoad: jest.fn(),
    updateCounters: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentAvailabilityService,
        {
          provide: 'IAgentAvailabilityRepository',
          useValue: mockAvailabilityRepo,
        },
        { provide: TeamEventPublisher, useValue: mockEventPublisher },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AgentAvailabilityService>(AgentAvailabilityService);
    availabilityRepo = module.get('IAgentAvailabilityRepository');
    publisher = module.get(TeamEventPublisher);
    audit = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('updateAvailability', () => {
    const tenantId = randomUUID();
    const agentProfileId = randomUUID();

    it('should update availability status and publish event successfully', async () => {
      const availability = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId,
        status: 'OFFLINE',
        lastSeenAt: new Date(),
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });

      availabilityRepo.findByAgentProfileId.mockResolvedValue(availability);

      const dto: UpdateAvailabilityDto = {
        status: 'ONLINE',
        workingHours: {
          timezone: 'UTC',
          slots: [{ start: '09:00', end: '17:00' }],
        },
      };

      const result = await service.updateAvailability(
        tenantId,
        agentProfileId,
        dto,
        'user-123',
      );

      expect(result.status).toBe('ONLINE');
      expect(result.workingHours).toEqual(dto.workingHours);
      expect(availabilityRepo.save).toHaveBeenCalled();
      expect(publisher.publish).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AVAILABILITY_UPDATE',
        }),
      );
    });

    it('should throw NotFoundException if availability record is not found', async () => {
      availabilityRepo.findByAgentProfileId.mockResolvedValue(null);
      const dto: UpdateAvailabilityDto = { status: 'ONLINE' };

      await expect(
        service.updateAvailability(tenantId, agentProfileId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailability', () => {
    const tenantId = randomUUID();
    const agentProfileId = randomUUID();

    it('should return availability record if found', async () => {
      const availability = new AgentAvailability(randomUUID(), {
        tenantId,
        agentProfileId,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentLoad: 0,
        activeConversations: 0,
        activeTickets: 0,
      });

      availabilityRepo.findByAgentProfileId.mockResolvedValue(availability);

      const result = await service.getAvailability(tenantId, agentProfileId);
      expect(result).toBe(availability);
    });

    it('should throw NotFoundException if not found', async () => {
      availabilityRepo.findByAgentProfileId.mockResolvedValue(null);

      await expect(
        service.getAvailability(tenantId, agentProfileId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLoad & updateCounters', () => {
    const tenantId = randomUUID();
    const agentProfileId = randomUUID();

    it('should delegate updateLoad to repository', async () => {
      await service.updateLoad(tenantId, agentProfileId, 5);
      expect(availabilityRepo.updateLoad).toHaveBeenCalledWith(
        agentProfileId,
        5,
        tenantId,
      );
    });

    it('should delegate updateCounters to repository', async () => {
      await service.updateCounters(tenantId, agentProfileId, 2, 3);
      expect(availabilityRepo.updateCounters).toHaveBeenCalledWith(
        agentProfileId,
        2,
        3,
        tenantId,
      );
    });
  });
});
