import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { WidgetSettings } from '../domain/entities';
import { UpdateWidgetSettingsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WidgetSettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getWidgetSettings(tenantId: string): Promise<WidgetSettings> {
    let settings = await this.settingsRepo.getWidgetSettings(tenantId);
    if (!settings) {
      settings = new WidgetSettings(uuidv4(), {
        tenantId,
        widgetName: 'Live Support',
        widgetColor: '#1A73E8',
        widgetPosition: 'BOTTOM_RIGHT',
        welcomeMessage: 'Hello! How can we help you today?',
        offlineMessage: 'We are currently offline. Please leave a message.',
      });
      await this.settingsRepo.saveWidgetSettings(settings);
    }
    return settings;
  }

  async updateWidgetSettings(
    tenantId: string,
    dto: UpdateWidgetSettingsDto,
  ): Promise<WidgetSettings> {
    const settings = await this.getWidgetSettings(tenantId);
    settings.update({
      widgetName: dto.widgetName || settings.widgetName,
      widgetColor: dto.widgetColor || settings.widgetColor,
      widgetPosition: dto.widgetPosition || settings.widgetPosition,
      welcomeMessage:
        dto.welcomeMessage !== undefined
          ? dto.welcomeMessage
          : settings.welcomeMessage,
      offlineMessage:
        dto.offlineMessage !== undefined
          ? dto.offlineMessage
          : settings.offlineMessage,
      avatarUrl:
        dto.avatarUrl !== undefined ? dto.avatarUrl : settings.avatarUrl,
      customCss:
        dto.customCss !== undefined ? dto.customCss : settings.customCss,
      customJs: dto.customJs !== undefined ? dto.customJs : settings.customJs,
    });

    await this.settingsRepo.saveWidgetSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
