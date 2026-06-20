import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IAdminRepository } from '../repositories/admin-repository.interface';
import type { IConnectorRepository } from '../../connectors/repositories/connector-repository.interface';
import { TenantOverride } from '../domain/tenant-override.entity';
import { FeatureAccess } from '../domain/feature-access.entity';
import { AdminEventPublisher } from './admin-event.publisher';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { TenantOverrideCreatedEvent } from '@easydev/shared-events';
import { AiSettingsService } from '../../settings/services/ai-settings.service';
import { AiAgentService } from '../../ai-integration/services/ai-agent.service';
import { AiUsageService } from '../../ai-integration/services/ai-usage.service';
import { ConnectorExecutionService } from '../../connectors/services/connector-execution.service';
import { UpdateAiSettingsDto } from '../../settings/dtos/settings.dto';
import { UpdateAgentDto, ModelConfigDto } from '../../ai-integration/dtos/ai.dto';
import { CreateOverrideDto, SetFeatureAccessDto } from '../dtos';

@Injectable()
export class AdminOverrideService {
  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    @Inject('IConnectorRepository')
    private readonly connectorRepository: IConnectorRepository,
    private readonly eventPublisher: AdminEventPublisher,
    private readonly queueService: QueueService,
    private readonly aiSettingsService: AiSettingsService,
    private readonly aiAgentService: AiAgentService,
    private readonly aiUsageService: AiUsageService,
    private readonly connectorExecutionService: ConnectorExecutionService,
  ) {}

  private async enqueueAudit(
    tenantId: string,
    action: string,
    details: string,
    userId?: string,
  ): Promise<void> {
    await this.queueService.addJob(QUEUES.ADMIN, 'admin-audit-job', {
      tenantId,
      userId,
      action,
      details,
      createdBy: userId,
    });
  }

  // ---- Tenant overrides ----

  public async createOverride(
    tenantId: string,
    dto: CreateOverrideDto,
    createdBy?: string,
  ): Promise<TenantOverride> {
    const override = TenantOverride.create(crypto.randomUUID(), {
      tenantId,
      featureKey: dto.featureKey,
      overrideValue: dto.overrideValue,
      reason: dto.reason,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      createdBy,
    });
    await this.repository.saveOverride(override, tenantId);
    await this.eventPublisher.publish(
      new TenantOverrideCreatedEvent(tenantId, override.id, override.featureKey),
    );
    await this.enqueueAudit(
      tenantId,
      'TENANT_OVERRIDE_CREATED',
      `Override set for "${dto.featureKey}": ${dto.reason}`,
      createdBy,
    );
    return override;
  }

  public async getOverride(tenantId: string, featureKey: string): Promise<TenantOverride> {
    const override = await this.repository.getOverride(tenantId, featureKey);
    if (!override) {
      throw new NotFoundException(`No override found for feature "${featureKey}"`);
    }
    return override;
  }

  public async listOverrides(tenantId: string): Promise<TenantOverride[]> {
    return this.repository.listOverrides(tenantId);
  }

  public async deleteOverride(
    tenantId: string,
    featureKey: string,
    deletedBy?: string,
  ): Promise<boolean> {
    const deleted = await this.repository.deleteOverride(tenantId, featureKey);
    if (deleted) {
      await this.enqueueAudit(
        tenantId,
        'TENANT_OVERRIDE_REMOVED',
        `Override removed for "${featureKey}"`,
        deletedBy,
      );
    }
    return deleted;
  }

  public async processExpiredOverrides(limit = 500): Promise<number> {
    const expired = await this.repository.findExpiredOverrides(new Date(), limit);
    for (const override of expired) {
      await this.repository.deleteOverride(override.tenantId, override.featureKey);
    }
    return expired.length;
  }

  // ---- Feature access ----

  public async setFeatureAccess(
    tenantId: string,
    dto: SetFeatureAccessDto,
    grantedBy?: string,
  ): Promise<FeatureAccess> {
    const existing = await this.repository.getFeatureAccess(tenantId, dto.featureKey);
    const access =
      existing ||
      FeatureAccess.create(crypto.randomUUID(), {
        tenantId,
        featureKey: dto.featureKey,
        isEnabled: dto.isEnabled,
        plan: dto.plan,
      });
    if (dto.isEnabled) {
      access.grant(grantedBy, dto.notes);
    } else {
      access.revoke(dto.notes);
    }
    await this.repository.saveFeatureAccess(access, tenantId);
    return access;
  }

  public async getFeatureAccess(
    tenantId: string,
    featureKey: string,
  ): Promise<FeatureAccess | null> {
    return this.repository.getFeatureAccess(tenantId, featureKey);
  }

  public async listFeatureAccess(tenantId: string): Promise<FeatureAccess[]> {
    return this.repository.listFeatureAccess(tenantId);
  }

  public async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    const access = await this.repository.getFeatureAccess(tenantId, featureKey);
    return access ? access.isEnabled : true;
  }

  // ---- AI governance ----

  public async getAiGovernance(tenantId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const [settings, usageToday] = await Promise.all([
      this.aiSettingsService.getAiSettings(tenantId),
      this.aiUsageService.getUsageMetrics(tenantId, undefined, today, today),
    ]);
    return { settings: settings.toJSON(), usageToday };
  }

  public async updateAiGovernance(
    tenantId: string,
    dto: UpdateAiSettingsDto,
    updatedBy?: string,
  ) {
    const settings = await this.aiSettingsService.updateAiSettings(tenantId, dto);
    await this.enqueueAudit(
      tenantId,
      'AI_CONFIG_GOVERNANCE_UPDATED',
      `AI governance settings updated: ${JSON.stringify(dto)}`,
      updatedBy,
    );
    return settings.toJSON();
  }

  public async listAgentConfigurations(tenantId: string) {
    const agents = await this.aiAgentService.findAgents(tenantId);
    return agents.map((a) => a.toJSON());
  }

  public async updateAgentConfiguration(
    tenantId: string,
    agentId: string,
    dto: UpdateAgentDto,
    updatedBy?: string,
  ) {
    const agent = await this.aiAgentService.updateAgent(tenantId, agentId, dto);
    await this.enqueueAudit(
      tenantId,
      'AI_CONFIG_AGENT_UPDATED',
      `AI agent ${agentId} configuration updated`,
      updatedBy,
    );
    return agent.toJSON();
  }

  public async updateAgentModelConfiguration(
    tenantId: string,
    agentId: string,
    dto: ModelConfigDto,
    updatedBy?: string,
  ) {
    const agent = await this.aiAgentService.setAgentModelConfig(tenantId, agentId, dto);
    await this.enqueueAudit(
      tenantId,
      'AI_CONFIG_MODEL_UPDATED',
      `AI agent ${agentId} model configuration set to ${dto.provider}/${dto.modelName}`,
      updatedBy,
    );
    return agent.toJSON();
  }

  // ---- Connector governance ----

  public async getConnectorGovernance(tenantId: string, connectorId: string) {
    const [rateLimit, allExecutions, failedExecutions] = await Promise.all([
      this.connectorRepository.getRateLimit(tenantId, connectorId),
      this.connectorExecutionService.getExecutions(tenantId, connectorId, {}),
      this.connectorExecutionService.getExecutions(tenantId, connectorId, {
        status: 'FAILED',
      }),
    ]);
    const retried = allExecutions.data.filter((e) => e.attempt > 1).length;
    return {
      rateLimit: rateLimit
        ? {
            windowSeconds: rateLimit.windowSeconds,
            maxRequests: rateLimit.maxRequests,
            currentUsage: rateLimit.currentUsage,
            resetAt: rateLimit.resetAt,
          }
        : null,
      totalExecutions: allExecutions.total,
      failedExecutions: failedExecutions.total,
      retriedExecutions: retried,
    };
  }

  public async getConnectorAuditLogs(
    tenantId: string,
    connectorId: string,
    options?: { level?: string; page?: number; limit?: number },
  ) {
    return this.connectorRepository.findLogs(tenantId, connectorId, options);
  }
}
