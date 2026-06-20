import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { SlaSettings } from '../domain/entities';
import { UpdateSlaSettingsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SlaSettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getSlaSettings(tenantId: string): Promise<SlaSettings> {
    let settings = await this.settingsRepo.getSlaSettings(tenantId);
    if (!settings) {
      settings = new SlaSettings(uuidv4(), {
        tenantId,
        responseTimeTarget: 3600, // 1 hour
        resolutionTimeTarget: 86400, // 24 hours
        escalationTimeTarget: 14400, // 4 hours
        businessHoursOnly: true,
        configuration: {},
      });
      await this.settingsRepo.saveSlaSettings(settings);
    }
    return settings;
  }

  async updateSlaSettings(
    tenantId: string,
    dto: UpdateSlaSettingsDto,
  ): Promise<SlaSettings> {
    const settings = await this.getSlaSettings(tenantId);
    settings.update({
      responseTimeTarget:
        dto.responseTimeTarget !== undefined
          ? dto.responseTimeTarget
          : settings.responseTimeTarget,
      resolutionTimeTarget:
        dto.resolutionTimeTarget !== undefined
          ? dto.resolutionTimeTarget
          : settings.resolutionTimeTarget,
      escalationTimeTarget:
        dto.escalationTimeTarget !== undefined
          ? dto.escalationTimeTarget
          : settings.escalationTimeTarget,
      businessHoursOnly:
        dto.businessHoursOnly !== undefined
          ? dto.businessHoursOnly
          : settings.businessHoursOnly,
      configuration: dto.configuration || settings.configuration,
    });

    await this.settingsRepo.saveSlaSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'sla_settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
