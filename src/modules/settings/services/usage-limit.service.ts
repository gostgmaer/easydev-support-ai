import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { UsageLimits } from '../domain/entities';
import { UpdateUsageLimitsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsageLimitService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
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
}
