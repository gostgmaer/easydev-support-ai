import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  IAdminRepository,
  IncidentQueryOptions,
  PaginatedResult,
} from '../repositories/admin-repository.interface';
import { OperationalIncident } from '../domain/operational-incident.entity';
import {
  IncidentStatusEnum,
  IncidentSeverityEnum,
} from '../domain/value-objects';
import { AdminEventPublisher } from './admin-event.publisher';
import {
  AdminIncidentCreatedEvent,
  AdminIncidentResolvedEvent,
} from '@easydev/shared-events';
import { CreateIncidentDto, UpdateIncidentStatusDto } from '../dtos';

@Injectable()
export class AdminIncidentService {
  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    private readonly eventPublisher: AdminEventPublisher,
  ) {}

  public async createIncident(
    tenantId: string,
    dto: CreateIncidentDto,
  ): Promise<OperationalIncident> {
    const incident = OperationalIncident.create(crypto.randomUUID(), {
      tenantId,
      title: dto.title,
      severity: dto.severity,
      affectedService: dto.affectedService,
      description: dto.description,
    });
    await this.repository.saveIncident(incident, tenantId);
    await this.eventPublisher.publish(
      new AdminIncidentCreatedEvent(
        tenantId,
        incident.id,
        incident.severity,
        incident.affectedService,
      ),
    );
    return incident;
  }

  public async openOrEscalate(
    tenantId: string,
    affectedService: string,
    title: string,
    severity: IncidentSeverityEnum,
    description?: string,
  ): Promise<OperationalIncident> {
    const existing = await this.repository.findOpenIncidentByService(
      tenantId,
      affectedService,
    );
    if (existing) {
      existing.escalate(severity);
      await this.repository.saveIncident(existing, tenantId);
      return existing;
    }
    return this.createIncident(tenantId, {
      title,
      severity,
      affectedService,
      description,
    });
  }

  public async getIncident(
    tenantId: string,
    id: string,
  ): Promise<OperationalIncident> {
    const incident = await this.repository.getIncident(tenantId, id);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }
    return incident;
  }

  public async listIncidents(
    tenantId: string,
    options?: IncidentQueryOptions,
  ): Promise<PaginatedResult<OperationalIncident>> {
    return this.repository.listIncidents(tenantId, options);
  }

  public async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateIncidentStatusDto,
  ): Promise<OperationalIncident> {
    const incident = await this.getIncident(tenantId, id);
    incident.updateStatus(dto.status);
    await this.repository.saveIncident(incident, tenantId);
    if (dto.status === IncidentStatusEnum.RESOLVED) {
      await this.eventPublisher.publish(
        new AdminIncidentResolvedEvent(tenantId, incident.id),
      );
    }
    return incident;
  }

  public async resolveIncident(
    tenantId: string,
    id: string,
  ): Promise<OperationalIncident> {
    return this.updateStatus(tenantId, id, {
      status: IncidentStatusEnum.RESOLVED,
    });
  }

  public async resolveByService(
    tenantId: string,
    affectedService: string,
  ): Promise<OperationalIncident | null> {
    const existing = await this.repository.findOpenIncidentByService(
      tenantId,
      affectedService,
    );
    if (!existing) return null;
    existing.resolve();
    await this.repository.saveIncident(existing, tenantId);
    await this.eventPublisher.publish(
      new AdminIncidentResolvedEvent(tenantId, existing.id),
    );
    return existing;
  }
}
