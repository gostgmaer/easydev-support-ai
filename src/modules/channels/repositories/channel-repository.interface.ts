import { Channel } from '../domain/channel.aggregate';
import { ChannelConfiguration } from '../domain/channel-configuration.entity';
import { ChannelWebhook } from '../domain/channel-webhook.entity';
import { ChannelTemplate } from '../domain/channel-template.entity';
import { ChannelRateLimit } from '../domain/channel-rate-limit.entity';

export interface ChannelQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IChannelRepository {
  findById(id: string, tenantId: string): Promise<Channel | null>;
  findByName(name: string, tenantId: string): Promise<Channel | null>;
  findAll(tenantId: string): Promise<Channel[]>;
  findPaginated(tenantId: string, options: ChannelQueryOptions): Promise<{ data: Channel[]; total: number }>;
  save(channel: Channel, tenantId: string): Promise<Channel>;
  delete(id: string, tenantId: string): Promise<boolean>;

  findConfigByChannelId(channelId: string, tenantId: string): Promise<ChannelConfiguration | null>;
  saveConfig(config: ChannelConfiguration, tenantId: string): Promise<void>;

  findWebhookByChannelId(channelId: string, tenantId: string): Promise<ChannelWebhook | null>;
  saveWebhook(webhook: ChannelWebhook, tenantId: string): Promise<void>;

  findTemplatesByChannelId(channelId: string, tenantId: string): Promise<ChannelTemplate[]>;
  findTemplateByName(channelId: string, name: string, tenantId: string): Promise<ChannelTemplate | null>;
  saveTemplate(template: ChannelTemplate, tenantId: string): Promise<void>;
  deleteTemplate(channelId: string, templateName: string, tenantId: string): Promise<void>;

  findRateLimitByChannelId(channelId: string, tenantId: string): Promise<ChannelRateLimit | null>;
  saveRateLimit(rateLimit: ChannelRateLimit, tenantId: string): Promise<void>;
}
