import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { TenantSettings } from '../domain/entities';
import {
  CreateTenantSettingsDto,
  UpdateTenantSettingsDto,
} from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantSettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async createSettings(
    tenantId: string,
    dto: CreateTenantSettingsDto,
  ): Promise<TenantSettings> {
    const settings = new TenantSettings(uuidv4(), {
      tenantId,
      tenantName: dto.tenantName,
      industry: dto.industry,
      timezone: dto.timezone || 'UTC',
      locale: dto.locale || 'en',
      country: dto.country,
      currency: dto.currency || 'USD',
      supportEmail: dto.supportEmail,
      supportPhone: dto.supportPhone,
      websiteUrl: dto.websiteUrl,
      status: 'ACTIVE',
      metadata: dto.metadata || {},
    });

    await this.settingsRepo.saveSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'settings.updated',
      settings.toJSON(),
    );
    return settings;
  }

  async getSettings(tenantId: string): Promise<TenantSettings> {
    let settings = await this.settingsRepo.getSettingsByTenant(tenantId);
    if (!settings) {
      // Auto-provision default settings for new tenants
      settings = await this.createSettings(tenantId, {
        tenantName: 'Default Workspace',
        timezone: 'UTC',
        locale: 'en',
        currency: 'USD',
      });
    }
    return settings;
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettings> {
    const settings = await this.getSettings(tenantId);
    settings.update({
      tenantName: dto.tenantName || settings.tenantName,
      industry: dto.industry !== undefined ? dto.industry : settings.industry,
      timezone: dto.timezone || settings.timezone,
      locale: dto.locale || settings.locale,
      country: dto.country !== undefined ? dto.country : settings.country,
      currency: dto.currency || settings.currency,
      supportEmail:
        dto.supportEmail !== undefined
          ? dto.supportEmail
          : settings.supportEmail,
      supportPhone:
        dto.supportPhone !== undefined
          ? dto.supportPhone
          : settings.supportPhone,
      websiteUrl:
        dto.websiteUrl !== undefined ? dto.websiteUrl : settings.websiteUrl,
      status: dto.status || settings.status,
      metadata: dto.metadata !== undefined ? dto.metadata : settings.metadata,
    });

    await this.settingsRepo.saveSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
