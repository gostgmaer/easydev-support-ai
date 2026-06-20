import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { SecuritySettings } from '../domain/entities';
import { UpdateSecuritySettingsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SecuritySettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getSecuritySettings(tenantId: string): Promise<SecuritySettings> {
    let settings = await this.settingsRepo.getSecuritySettings(tenantId);
    if (!settings) {
      settings = new SecuritySettings(uuidv4(), {
        tenantId,
        sessionTimeout: 3600,
        ipWhitelist: [],
        mfaRequired: false,
        apiKeyRotationDays: 90,
        auditRetentionDays: 365,
        configuration: {},
      });
      await this.settingsRepo.saveSecuritySettings(settings);
    }
    return settings;
  }

  async updateSecuritySettings(
    tenantId: string,
    dto: UpdateSecuritySettingsDto,
  ): Promise<SecuritySettings> {
    const settings = await this.getSecuritySettings(tenantId);
    settings.update({
      sessionTimeout:
        dto.sessionTimeout !== undefined
          ? dto.sessionTimeout
          : settings.sessionTimeout,
      ipWhitelist: dto.ipWhitelist || settings.ipWhitelist,
      mfaRequired:
        dto.mfaRequired !== undefined ? dto.mfaRequired : settings.mfaRequired,
      apiKeyRotationDays:
        dto.apiKeyRotationDays !== undefined
          ? dto.apiKeyRotationDays
          : settings.apiKeyRotationDays,
      auditRetentionDays:
        dto.auditRetentionDays !== undefined
          ? dto.auditRetentionDays
          : settings.auditRetentionDays,
      configuration: dto.configuration || settings.configuration,
    });

    await this.settingsRepo.saveSecuritySettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'security_settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
