import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { FeatureFlag } from '../domain/entities';
import { SaveFeatureFlagDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { FeatureFlagEngine } from '../engines/feature-flag.engine';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FeatureFlagService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
    private readonly flagEngine: FeatureFlagEngine,
  ) {}

  async getFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
    return this.settingsRepo.getFeatureFlags(tenantId);
  }

  async saveFeatureFlag(
    tenantId: string,
    dto: SaveFeatureFlagDto,
  ): Promise<FeatureFlag> {
    const existing = await this.settingsRepo.getFeatureFlagByKey(
      tenantId,
      dto.featureKey,
    );

    const flag = existing
      ? new FeatureFlag(existing.id, {
          tenantId,
          featureKey: dto.featureKey,
          enabled: dto.enabled,
          rolloutPercentage: dto.rolloutPercentage,
          configuration: dto.configuration || existing.configuration,
          createdAt: existing.createdAt,
        })
      : new FeatureFlag(uuidv4(), {
          tenantId,
          featureKey: dto.featureKey,
          enabled: dto.enabled,
          rolloutPercentage: dto.rolloutPercentage,
          configuration: dto.configuration || {},
        });

    await this.settingsRepo.saveFeatureFlag(flag);
    await this.flagEngine.invalidateCache(tenantId, dto.featureKey);
    await this.eventPublisher.publish(
      tenantId,
      'feature_flag.updated',
      flag.toJSON(),
    );
    return flag;
  }

  async deleteFeatureFlag(tenantId: string, id: string): Promise<void> {
    const list = await this.getFeatureFlags(tenantId);
    const existing = list.find((f) => f.id === id);
    if (existing) {
      await this.settingsRepo.deleteFeatureFlag(id, tenantId);
      await this.flagEngine.invalidateCache(tenantId, existing.featureKey);
      await this.eventPublisher.publish(tenantId, 'feature_flag.updated', {
        id,
        featureKey: existing.featureKey,
        action: 'DELETED',
      });
    }
  }

  async resolveFlag(
    tenantId: string,
    featureKey: string,
    context?: { userId?: string },
  ): Promise<boolean> {
    return this.flagEngine.resolveFlag(tenantId, featureKey, context);
  }
}
