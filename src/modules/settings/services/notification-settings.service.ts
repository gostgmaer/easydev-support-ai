import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { NotificationSettings } from '../domain/entities';
import { UpdateNotificationSettingsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getNotificationSettings(
    tenantId: string,
  ): Promise<NotificationSettings> {
    let settings = await this.settingsRepo.getNotificationSettings(tenantId);
    if (!settings) {
      settings = new NotificationSettings(uuidv4(), {
        tenantId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        webhookEnabled: false,
        digestEnabled: false,
        configuration: {},
      });
      await this.settingsRepo.saveNotificationSettings(settings);
    }
    return settings;
  }

  async updateNotificationSettings(
    tenantId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const settings = await this.getNotificationSettings(tenantId);
    settings.update({
      emailEnabled:
        dto.emailEnabled !== undefined
          ? dto.emailEnabled
          : settings.emailEnabled,
      smsEnabled:
        dto.smsEnabled !== undefined ? dto.smsEnabled : settings.smsEnabled,
      pushEnabled:
        dto.pushEnabled !== undefined ? dto.pushEnabled : settings.pushEnabled,
      webhookEnabled:
        dto.webhookEnabled !== undefined
          ? dto.webhookEnabled
          : settings.webhookEnabled,
      digestEnabled:
        dto.digestEnabled !== undefined
          ? dto.digestEnabled
          : settings.digestEnabled,
      configuration: dto.configuration || settings.configuration,
    });

    await this.settingsRepo.saveNotificationSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
