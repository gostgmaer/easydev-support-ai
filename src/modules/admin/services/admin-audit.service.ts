import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IAdminRepository } from '../repositories/admin-repository.interface';
import type { IConnectorRepository } from '../../connectors/repositories/connector-repository.interface';
import {
  AuditRepository,
  AuditLogQueryOptions,
} from '../../audit/audit.repository';
import { WorkflowAuditService } from '../../workflows/services/workflow-audit.service';
import { AuditView } from '../domain/audit-view.entity';
import { CreateAuditViewDto } from '../dtos';

// Action strings recorded by SettingsModule's settings-audit-job (see
// settings-queue.processor.ts), used to scope the "Settings Changes" audit view.
const SETTINGS_ACTIONS = new Set([
  'ai_settings.updated',
  'branding.updated',
  'business_hours.updated',
  'channel_settings.updated',
  'feature_flag.updated',
  'holiday.created',
  'holiday.updated',
  'security_settings.updated',
  'sla_settings.updated',
  'usage_limit.updated',
  'settings.updated',
]);

@Injectable()
export class AdminAuditService {
  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    @Inject('IConnectorRepository')
    private readonly connectorRepository: IConnectorRepository,
    private readonly auditRepository: AuditRepository,
    private readonly workflowAuditService: WorkflowAuditService,
  ) {}

  public async listEntityChanges(
    tenantId: string,
    options: AuditLogQueryOptions,
  ) {
    return this.auditRepository.findPaginated(tenantId, options);
  }

  public async listSettingsChanges(
    tenantId: string,
    options: AuditLogQueryOptions,
  ) {
    return this.listByActionPredicate(
      tenantId,
      (action) => SETTINGS_ACTIONS.has(action),
      options,
    );
  }

  public async listApiKeyChanges(
    tenantId: string,
    options: AuditLogQueryOptions,
  ) {
    return this.listByActionPredicate(
      tenantId,
      (action) => action.startsWith('API_KEY'),
      options,
    );
  }

  public async listSecurityEvents(
    tenantId: string,
    options: AuditLogQueryOptions,
  ) {
    return this.listByActionPredicate(
      tenantId,
      (action) =>
        action.startsWith('SECURITY') || action === 'security_settings.updated',
      options,
    );
  }

  private async listByActionPredicate(
    tenantId: string,
    predicate: (action: string) => boolean,
    options: AuditLogQueryOptions,
  ) {
    const result = await this.auditRepository.findPaginated(tenantId, {
      ...options,
      action: undefined,
      limit: options.limit || 100,
    });
    const filtered = result.data.filter((row) => predicate(row.action));
    return { data: filtered, total: filtered.length };
  }

  public async listWorkflowChanges(
    tenantId: string,
    workflowId?: string,
    executionId?: string,
  ) {
    return this.workflowAuditService.getAuditLogs(
      tenantId,
      workflowId,
      executionId,
    );
  }

  public async listConnectorChanges(
    tenantId: string,
    connectorId: string,
    options?: { level?: string; page?: number; limit?: number },
  ) {
    return this.connectorRepository.findLogs(tenantId, connectorId, options);
  }

  public async listAiConfigurationChanges(
    tenantId: string,
    options: AuditLogQueryOptions,
  ) {
    return this.listByActionPredicate(
      tenantId,
      (action) => action.startsWith('AI_'),
      options,
    );
  }

  // ---- Saved audit views ----

  public async createAuditView(
    tenantId: string,
    userId: string,
    dto: CreateAuditViewDto,
  ): Promise<AuditView> {
    const view = AuditView.create(crypto.randomUUID(), {
      tenantId,
      userId,
      name: dto.name,
      filterDefinition: dto.filterDefinition,
      isShared: dto.isShared,
    });
    await this.repository.saveAuditView(view, tenantId);
    return view;
  }

  public async listAuditViews(
    tenantId: string,
    userId: string,
  ): Promise<AuditView[]> {
    return this.repository.listAuditViews(tenantId, userId);
  }

  public async getAuditView(tenantId: string, id: string): Promise<AuditView> {
    const view = await this.repository.getAuditView(tenantId, id);
    if (!view) {
      throw new NotFoundException(`Audit view with ID ${id} not found`);
    }
    return view;
  }

  public async deleteAuditView(tenantId: string, id: string): Promise<boolean> {
    return this.repository.deleteAuditView(tenantId, id);
  }
}
