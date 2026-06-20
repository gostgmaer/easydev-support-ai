import { Test, TestingModule } from '@nestjs/testing';
import { AgentProfileService } from './agent-profile.service';
import { TeamEventPublisher } from './team-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { AgentProfile } from '../domain/agent-profile.entity';
import { AgentCapacity } from '../domain/value-objects';
import { AgentProfileDto, UpdateAgentProfileDto } from '../dtos';
import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('AgentProfileService', () => {
  let service: AgentProfileService;
  let profileRepo: any;
  let availabilityRepo: any;
  let publisher: any;
  let audit: any;

  const mockProfileRepo = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByEmployeeCode: jest.fn(),
    save: jest.fn((p) => Promise.resolve(p)),
    delete: jest.fn(),
    findPaginated: jest.fn(),
  };

  const mockAvailabilityRepo = {
    save: jest.fn(),
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
        AgentProfileService,
        { provide: 'IAgentProfileRepository', useValue: mockProfileRepo },
        { provide: 'IAgentAvailabilityRepository', useValue: mockAvailabilityRepo },
        { provide: TeamEventPublisher, useValue: mockEventPublisher },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AgentProfileService>(AgentProfileService);
    profileRepo = module.get('IAgentProfileRepository');
    availabilityRepo = module.get('IAgentAvailabilityRepository');
    publisher = module.get(TeamEventPublisher);
    audit = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = randomUUID();
    const dto: AgentProfileDto = {
      userId: randomUUID(),
      displayName: 'John Doe',
      employeeCode: 'EMP101',
      capacity: 10,
      maxConcurrentConversations: 5,
      maxOpenTickets: 20,
      skillScore: 4.5,
      timezone: 'UTC',
    };

    it('should create an agent profile and default availability successfully', async () => {
      profileRepo.findByUserId.mockResolvedValue(null);
      profileRepo.findByEmployeeCode.mockResolvedValue(null);

      const result = await service.create(tenantId, dto, 'user-123');

      expect(result).toBeDefined();
      expect(result.displayName).toBe('John Doe');
      expect(profileRepo.save).toHaveBeenCalled();
      expect(availabilityRepo.save).toHaveBeenCalled();
      expect(publisher.publish).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AGENT_CREATE',
        })
      );
    });

    it('should throw ConflictException if userId already exists', async () => {
      profileRepo.findByUserId.mockResolvedValue({ id: 'existing' });

      await expect(service.create(tenantId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if employeeCode already exists', async () => {
      profileRepo.findByUserId.mockResolvedValue(null);
      profileRepo.findByEmployeeCode.mockResolvedValue({ id: 'existing-code' });

      await expect(service.create(tenantId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const tenantId = randomUUID();
    const profileId = randomUUID();

    it('should update profile fields successfully', async () => {
      const profile = new AgentProfile(profileId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'John Old',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 }),
        skillScore: 3.0,
        timezone: 'UTC',
      });
      profileRepo.findById.mockResolvedValue(profile);

      const dto: UpdateAgentProfileDto = {
        displayName: 'John New',
        skillScore: 5.0,
      };

      const result = await service.update(tenantId, profileId, dto, 'user-123');

      expect(result.displayName).toBe('John New');
      expect(result.skillScore).toBe(5.0);
      expect(profileRepo.save).toHaveBeenCalled();
      expect(publisher.publish).toHaveBeenCalled();
    });

    it('should update capacity fields if provided', async () => {
      const profile = new AgentProfile(profileId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'John Old',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 }),
        skillScore: 3.0,
        timezone: 'UTC',
      });
      profileRepo.findById.mockResolvedValue(profile);

      const dto: UpdateAgentProfileDto = {
        capacity: 15,
      };

      const result = await service.update(tenantId, profileId, dto, 'user-123');

      expect(result.capacity.capacity).toBe(15);
      expect(profileRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      profileRepo.findById.mockResolvedValue(null);
      await expect(service.update(tenantId, profileId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById & delete', () => {
    const tenantId = randomUUID();
    const profileId = randomUUID();

    it('should find profile by id', async () => {
      const profile = new AgentProfile(profileId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'John Old',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 }),
        skillScore: 3.0,
        timezone: 'UTC',
      });
      profileRepo.findById.mockResolvedValue(profile);

      const result = await service.findById(tenantId, profileId);
      expect(result).toBe(profile);
    });

    it('should delete a profile successfully', async () => {
      const profile = new AgentProfile(profileId, {
        tenantId,
        userId: randomUUID(),
        displayName: 'John Old',
        status: 'ACTIVE',
        capacity: AgentCapacity.create({ capacity: 10, maxConcurrentConversations: 5, maxOpenTickets: 20 }),
        skillScore: 3.0,
        timezone: 'UTC',
      });
      profileRepo.findById.mockResolvedValue(profile);
      profileRepo.delete.mockResolvedValue(true);

      const deleted = await service.delete(tenantId, profileId, 'user-123');

      expect(deleted).toBe(true);
      expect(profileRepo.delete).toHaveBeenCalledWith(profileId, tenantId);
    });

    it('should throw NotFoundException on delete if profile not found', async () => {
      profileRepo.findById.mockResolvedValue(null);
      await expect(service.delete(tenantId, profileId)).rejects.toThrow(NotFoundException);
    });
  });
});
