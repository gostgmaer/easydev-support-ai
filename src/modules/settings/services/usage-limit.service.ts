import { ForbiddenException, Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { UsageLimits } from '../domain/entities';
import { UpdateUsageLimitsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class UsageLimitService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
    private readonly queueService: QueueService,
  ) {}

  async getUsageLimits(tenantId: string): Promise<UsageLimits> {
    let limits = await this.settingsRepo.getUsageLimits(tenantId);
    if (!limits) {
      limits = new UsageLimits(uuidv4(), {
        tenantId,
        maxAgents: 10,
        maxConversations: 1000,
        maxMessages: 10000,
        maxWorkflows: 5,
        maxConnectors: 3,
        maxDocuments: 50,
        maxStorage: 1073741824, // 1 GB
        maxAiRequests: 5000,
      });
      await this.settingsRepo.saveUsageLimits(limits);
    }
    return limits;
  }

  async updateUsageLimits(
    tenantId: string,
    dto: UpdateUsageLimitsDto,
  ): Promise<UsageLimits> {
    const limits = await this.getUsageLimits(tenantId);
    limits.update({
      maxAgents: dto.maxAgents !== undefined ? dto.maxAgents : limits.maxAgents,
      maxConversations:
        dto.maxConversations !== undefined
          ? dto.maxConversations
          : limits.maxConversations,
      maxMessages:
        dto.maxMessages !== undefined ? dto.maxMessages : limits.maxMessages,
      maxWorkflows:
        dto.maxWorkflows !== undefined ? dto.maxWorkflows : limits.maxWorkflows,
      maxConnectors:
        dto.maxConnectors !== undefined
          ? dto.maxConnectors
          : limits.maxConnectors,
      maxDocuments:
        dto.maxDocuments !== undefined ? dto.maxDocuments : limits.maxDocuments,
      maxStorage:
        dto.maxStorage !== undefined ? dto.maxStorage : limits.maxStorage,
      maxAiRequests:
        dto.maxAiRequests !== undefined
          ? dto.maxAiRequests
          : limits.maxAiRequests,
    });

    await this.settingsRepo.saveUsageLimits(limits);
    await this.eventPublisher.publish(
      tenantId,
      'usage_limit.updated',
      limits.toJSON(),
    );
    return limits;
  }

  /**
   * UsageLimits stored plan ceilings but nothing in the codebase ever
   * compared real usage against them - a tenant could exceed every plan
   * limit with zero rejection. Hard-blocks once usage reaches the limit and
   * opens/escalates an operational incident (reusing the same
   * 'admin-incident-job' pipeline already wired for connector failures) so
   * ops has visibility into the overage rather than the tenant just being
   * silently blocked with no one aware billing/upgrade action may be needed.
   */
  async enforceLimit(
    tenantId: string,
    resource: 'conversations' | 'connectors' | 'aiRequests',
    currentUsage: number,
  ): Promise<void> {
    const limits = await this.getUsageLimits(tenantId);
    const limitByResource: Record<typeof resource, number> = {
      conversations: limits.maxConversations,
      connectors: limits.maxConnectors,
      aiRequests: limits.maxAiRequests,
    };
    const limit = limitByResource[resource];

    if (currentUsage < limit) return;

    try {
      await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
        tenantId,
        affectedService: `quota.${resource}`,
        title: `Tenant exceeded ${resource} plan limit`,
        severity: 'MEDIUM',
        description: `Tenant has reached ${currentUsage}/${limit} ${resource}. The triggering action was blocked. Overage billing or a plan upgrade may be needed to raise this limit.`,
      });
    } catch {
      // The throw below is the actual enforcement - incident visibility is
      // best-effort and must never be the reason enforcement fails to apply.
    }

    throw new ForbiddenException(
      `You've reached your plan's ${resource} limit (${limit}). Upgrade your plan or contact billing about overage charges to continue.`,
    );
  }
}
