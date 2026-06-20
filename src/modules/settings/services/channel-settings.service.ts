import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { ChannelSettings } from '../domain/entities';
import { UpdateChannelSettingsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChannelSettingsService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getChannelSettings(tenantId: string): Promise<ChannelSettings[]> {
    const list = await this.settingsRepo.getChannelSettings(tenantId);
    if (list.length === 0) {
      const emailChan = new ChannelSettings(uuidv4(), {
        tenantId,
        channelType: 'EMAIL',
        enabled: true,
        businessHoursOnly: false,
        autoAssignmentEnabled: true,
      });
      const chatChan = new ChannelSettings(uuidv4(), {
        tenantId,
        channelType: 'WEB_CHAT',
        enabled: true,
        businessHoursOnly: false,
        autoAssignmentEnabled: true,
      });
      await this.settingsRepo.saveChannelSettings(emailChan);
      await this.settingsRepo.saveChannelSettings(chatChan);
      return [emailChan, chatChan];
    }
    return list;
  }

  async getChannelSettingsByType(
    tenantId: string,
    channelType: string,
  ): Promise<ChannelSettings> {
    let settings = await this.settingsRepo.getChannelSettingsByType(
      tenantId,
      channelType,
    );
    if (!settings) {
      settings = new ChannelSettings(uuidv4(), {
        tenantId,
        channelType,
        enabled: false,
        businessHoursOnly: false,
        autoAssignmentEnabled: false,
      });
      await this.settingsRepo.saveChannelSettings(settings);
    }
    return settings;
  }

  async updateChannelSettings(
    tenantId: string,
    dto: UpdateChannelSettingsDto,
  ): Promise<ChannelSettings> {
    const settings = await this.getChannelSettingsByType(
      tenantId,
      dto.channelType,
    );
    settings.update({
      enabled: dto.enabled !== undefined ? dto.enabled : settings.enabled,
      businessHoursOnly:
        dto.businessHoursOnly !== undefined
          ? dto.businessHoursOnly
          : settings.businessHoursOnly,
      autoAssignmentEnabled:
        dto.autoAssignmentEnabled !== undefined
          ? dto.autoAssignmentEnabled
          : settings.autoAssignmentEnabled,
      configuration: dto.configuration || settings.configuration,
    });

    await this.settingsRepo.saveChannelSettings(settings);
    await this.eventPublisher.publish(
      tenantId,
      'channel_settings.updated',
      settings.toJSON(),
    );
    return settings;
  }
}
