import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAgentAvailabilityRepository } from '../repositories/agent-availability-repository.interface';
import { AgentAvailability } from '../domain/agent-availability.entity';
import { UpdateAvailabilityDto } from '../dtos';
import { AuditService } from '../../audit/audit.service';
import { TeamEventPublisher } from './team-event.publisher';
import { AvailabilityUpdatedEvent } from '@easydev/shared-events';

@Injectable()
export class AgentAvailabilityService {
  constructor(
    @Inject('IAgentAvailabilityRepository')
    private readonly availabilityRepo: IAgentAvailabilityRepository,
    private readonly eventPublisher: TeamEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  async updateAvailability(
    tenantId: string,
    agentProfileId: string,
    dto: UpdateAvailabilityDto,
    userId?: string,
  ): Promise<AgentAvailability> {
    const availability = await this.availabilityRepo.findByAgentProfileId(
      agentProfileId,
      tenantId,
    );
    if (!availability) {
      throw new NotFoundException(
        `Availability record for agent ${agentProfileId} not found`,
      );
    }

    availability.update({
      status: dto.status,
      workingHours: dto.workingHours,
      lastSeenAt: new Date(),
    });

    const saved = await this.availabilityRepo.save(availability, tenantId);
    await this.eventPublisher.publish(
      new AvailabilityUpdatedEvent(tenantId, agentProfileId, dto.status),
    );

    await this.auditService.log({
      tenantId,
      userId,
      action: 'AVAILABILITY_UPDATE',
      details: `Updated availability status of agent ${agentProfileId} to ${dto.status}`,
    });

    return saved;
  }

  async getAvailability(
    tenantId: string,
    agentProfileId: string,
  ): Promise<AgentAvailability> {
    const availability = await this.availabilityRepo.findByAgentProfileId(
      agentProfileId,
      tenantId,
    );
    if (!availability) {
      throw new NotFoundException(
        `Availability for agent ${agentProfileId} not found`,
      );
    }
    return availability;
  }

  async updateLoad(
    tenantId: string,
    agentProfileId: string,
    change: number,
  ): Promise<void> {
    await this.availabilityRepo.updateLoad(agentProfileId, change, tenantId);
  }

  async updateCounters(
    tenantId: string,
    agentProfileId: string,
    conversationsChange: number,
    ticketsChange: number,
  ): Promise<void> {
    await this.availabilityRepo.updateCounters(
      agentProfileId,
      conversationsChange,
      ticketsChange,
      tenantId,
    );
  }
}
