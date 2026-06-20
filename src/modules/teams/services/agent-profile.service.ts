import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IAgentProfileRepository } from '../repositories/agent-profile-repository.interface';
import type { IAgentAvailabilityRepository } from '../repositories/agent-availability-repository.interface';
import { AgentProfile } from '../domain/agent-profile.entity';
import { AgentAvailability } from '../domain/agent-availability.entity';
import { AgentCapacity } from '../domain/value-objects';
import { AgentProfileDto, UpdateAgentProfileDto } from '../dtos';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';
import { TeamEventPublisher } from './team-event.publisher';
import { AgentCreatedEvent, AgentUpdatedEvent } from '@easydev/shared-events';

@Injectable()
export class AgentProfileService {
  constructor(
    @Inject('IAgentProfileRepository')
    private readonly profileRepo: IAgentProfileRepository,
    @Inject('IAgentAvailabilityRepository')
    private readonly availabilityRepo: IAgentAvailabilityRepository,
    private readonly eventPublisher: TeamEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: AgentProfileDto,
    userId?: string,
  ): Promise<AgentProfile> {
    const existing = await this.profileRepo.findByUserId(dto.userId, tenantId);
    if (existing) {
      throw new ConflictException(
        `Agent profile for user ${dto.userId} already exists`,
      );
    }

    if (dto.employeeCode) {
      const existingCode = await this.profileRepo.findByEmployeeCode(
        dto.employeeCode,
        tenantId,
      );
      if (existingCode) {
        throw new ConflictException(
          `Agent with employee code ${dto.employeeCode} already exists`,
        );
      }
    }

    const id = randomUUID();
    const capacity = AgentCapacity.create({
      capacity: dto.capacity ?? 10,
      maxConcurrentConversations: dto.maxConcurrentConversations ?? 5,
      maxOpenTickets: dto.maxOpenTickets ?? 20,
    });

    const profile = new AgentProfile(id, {
      tenantId,
      userId: dto.userId,
      employeeCode: dto.employeeCode,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      status: 'ACTIVE',
      capacity,
      skillScore: dto.skillScore ?? 0,
      timezone: dto.timezone || 'UTC',
      languagePreferences: dto.languagePreferences,
      metadata: dto.metadata,
    });

    const saved = await this.profileRepo.save(profile, tenantId);

    const availability = new AgentAvailability(randomUUID(), {
      tenantId,
      agentProfileId: id,
      status: 'OFFLINE',
      currentLoad: 0,
      activeConversations: 0,
      activeTickets: 0,
    });
    await this.availabilityRepo.save(availability, tenantId);

    await this.eventPublisher.publish(
      new AgentCreatedEvent(tenantId, saved.id, saved.userId),
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'AGENT_CREATE',
      details: `Created agent profile for ${saved.displayName}`,
    });

    return saved;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAgentProfileDto,
    userId?: string,
  ): Promise<AgentProfile> {
    const profile = await this.profileRepo.findById(id, tenantId);
    if (!profile) {
      throw new NotFoundException(`Agent profile ${id} not found`);
    }

    const updates: any = {};
    if (dto.displayName !== undefined) updates.displayName = dto.displayName;
    if (dto.employeeCode !== undefined) updates.employeeCode = dto.employeeCode;
    if (dto.avatarUrl !== undefined) updates.avatarUrl = dto.avatarUrl;
    if (dto.timezone !== undefined) updates.timezone = dto.timezone;
    if (dto.languagePreferences !== undefined)
      updates.languagePreferences = dto.languagePreferences;
    if (dto.metadata !== undefined) updates.metadata = dto.metadata;
    if (dto.skillScore !== undefined) updates.skillScore = dto.skillScore;

    if (
      dto.capacity !== undefined ||
      dto.maxConcurrentConversations !== undefined ||
      dto.maxOpenTickets !== undefined
    ) {
      updates.capacity = AgentCapacity.create({
        capacity: dto.capacity ?? profile.capacity.capacity,
        maxConcurrentConversations:
          dto.maxConcurrentConversations ??
          profile.capacity.maxConcurrentConversations,
        maxOpenTickets: dto.maxOpenTickets ?? profile.capacity.maxOpenTickets,
      });
    }

    profile.update(updates);
    const saved = await this.profileRepo.save(profile, tenantId);

    await this.eventPublisher.publish(
      new AgentUpdatedEvent(tenantId, saved.id, saved.userId),
    );
    await this.auditService.log({
      tenantId,
      userId,
      action: 'AGENT_UPDATE',
      details: `Updated agent profile for ${saved.displayName}`,
    });

    return saved;
  }

  async findById(tenantId: string, id: string): Promise<AgentProfile> {
    const profile = await this.profileRepo.findById(id, tenantId);
    if (!profile) {
      throw new NotFoundException(`Agent profile ${id} not found`);
    }
    return profile;
  }

  async findPaginated(tenantId: string, options: any) {
    return this.profileRepo.findPaginated(tenantId, options);
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const profile = await this.profileRepo.findById(id, tenantId);
    if (!profile) {
      throw new NotFoundException(`Agent profile ${id} not found`);
    }

    const deleted = await this.profileRepo.delete(id, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'AGENT_DELETE',
      details: `Soft deleted agent profile ${id}`,
    });

    return deleted;
  }
}
