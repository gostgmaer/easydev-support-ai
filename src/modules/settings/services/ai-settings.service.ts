import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { AiSettings } from '../domain/entities';
import { UpdateAiSettingsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AiSettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getAiSettings(tenantId: string): Promise<AiSettings> {
    let settings = await this.settingsRepo.getAiSettings(tenantId);
    if (!settings) {
      settings = new AiSettings(uuidv4(), {
        tenantId,
        confidenceThreshold: 0.7,
        escalationThreshold: 0.4,
        allowedLanguages: ['en'],
        defaultLanguage: 'en',
        autoResponseEnabled: true,
        autoEscalationEnabled: true,
      });
      await this.settingsRepo.saveAiSettings(settings);
    }
    return settings;
  }

  async updateAiSettings(
    tenantId: string,
    dto: UpdateAiSettingsDto,
  ): Promise<AiSettings> {
    const settings = await this.getAiSettings(tenantId);
    settings.update({
      defaultAgent:
        dto.defaultAgent !== undefined
          ? dto.defaultAgent
          : settings.defaultAgent,
      confidenceThreshold:
        dto.confidenceThreshold !== undefined
          ? dto.confidenceThreshold
          : settings.confidenceThreshold,
      escalationThreshold:
        dto.escalationThreshold !== undefined
          ? dto.escalationThreshold
          : settings.escalationThreshold,
      allowedLanguages: dto.allowedLanguages || settings.allowedLanguages,
      defaultLanguage: dto.defaultLanguage || settings.defaultLanguage,
      autoResponseEnabled:
        dto.autoResponseEnabled !== undefined
          ? dto.autoResponseEnabled
          : settings.autoResponseEnabled,
      autoEscalationEnabled:
        dto.autoEscalationEnabled !== undefined
          ? dto.autoEscalationEnabled
          : settings.autoEscalationEnabled,
      costLimitDaily:
        dto.costLimitDaily !== undefined
          ? dto.costLimitDaily
          : settings.costLimitDaily,
      costLimitMonthly:
        dto.costLimitMonthly !== undefined
          ? dto.costLimitMonthly
          : settings.costLimitMonthly,
      modelConfiguration: dto.modelConfiguration || settings.modelConfiguration,
    });

    await this.settingsRepo.saveAiSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'ai_settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
