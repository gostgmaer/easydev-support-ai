import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IChannelRepository } from '../repositories/channel-repository.interface';
import { ChannelConfiguration } from '../domain/channel-configuration.entity';
import { ChannelConfigurationDto } from '../dtos';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ChannelConfigurationService {
  constructor(
    @Inject('IChannelRepository')
    private readonly channelRepo: IChannelRepository,
    private readonly auditService: AuditService
  ) {}

  async saveConfiguration(
    tenantId: string,
    channelId: string,
    dto: ChannelConfigurationDto,
    userId?: string
  ): Promise<ChannelConfiguration> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    let config = await this.channelRepo.findConfigByChannelId(channelId, tenantId);
    if (config) {
      config.update({
        authenticationType: dto.authenticationType,
        configuration: dto.configuration,
        credentials: dto.credentials,
        settings: dto.settings,
      });
    } else {
      config = new ChannelConfiguration(randomUUID(), {
        tenantId,
        channelId,
        authenticationType: dto.authenticationType,
        configuration: dto.configuration,
        credentials: dto.credentials,
        settings: dto.settings,
      });
    }

    await this.channelRepo.saveConfig(config, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_CONFIG_SAVE',
      details: `Saved configuration for channel ${channelId}`,
    });

    return config;
  }

  async getConfiguration(tenantId: string, channelId: string): Promise<ChannelConfiguration> {
    const config = await this.channelRepo.findConfigByChannelId(channelId, tenantId);
    if (!config) {
      throw new NotFoundException(`Configuration for channel ${channelId} not found`);
    }
    return config;
  }

  async rotateSecrets(tenantId: string, channelId: string, userId?: string): Promise<void> {
    const config = await this.channelRepo.findConfigByChannelId(channelId, tenantId);
    if (!config) throw new NotFoundException(`Configuration for channel ${channelId} not found`);

    const newSecret = randomUUID();
    const credentials = { ...config.credentials, api_key: newSecret };
    config.update({ credentials });

    await this.channelRepo.saveConfig(config, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_SECRET_ROTATE',
      details: `Rotated API secrets for channel ${channelId}`,
    });
  }
}
