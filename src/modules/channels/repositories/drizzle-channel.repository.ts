import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { Channel } from '../domain/channel.aggregate';
import { ChannelConfiguration } from '../domain/channel-configuration.entity';
import { ChannelWebhook } from '../domain/channel-webhook.entity';
import { ChannelTemplate } from '../domain/channel-template.entity';
import { ChannelRateLimit } from '../domain/channel-rate-limit.entity';
import {
  ChannelType,
  ChannelStatus,
  ChannelProvider,
} from '../domain/value-objects';
import {
  IChannelRepository,
  ChannelQueryOptions,
} from './channel-repository.interface';

class ChannelMapper {
  public static toDomain(
    rawChannel: any,
    rawConfig?: any,
    rawWebhook?: any,
    rawTemplates: any[] = [],
    rawRateLimit?: any,
  ): Channel {
    const type = ChannelType.create(rawChannel.type);
    const status = ChannelStatus.create(rawChannel.status);
    const provider = ChannelProvider.create(rawChannel.provider);

    const configuration = rawConfig
      ? new ChannelConfiguration(rawConfig.id, {
          tenantId: rawConfig.tenantId,
          channelId: rawConfig.channelId,
          authenticationType: rawConfig.authenticationType,
          configuration: (rawConfig.configuration as Record<string, any>) || {},
          credentials: (rawConfig.credentials as Record<string, any>) || {},
          settings: (rawConfig.settings as Record<string, any>) || {},
          healthStatus: rawConfig.healthStatus,
          lastHealthCheck: rawConfig.lastHealthCheck || undefined,
          createdAt: rawConfig.createdAt,
          updatedAt: rawConfig.updatedAt,
          version: rawConfig.version,
        })
      : undefined;

    const webhook = rawWebhook
      ? new ChannelWebhook(rawWebhook.id, {
          tenantId: rawWebhook.tenantId,
          channelId: rawWebhook.channelId,
          webhookUrl: rawWebhook.webhookUrl,
          webhookSecret: rawWebhook.webhookSecret || undefined,
          verificationToken: rawWebhook.verificationToken || undefined,
          status: rawWebhook.status,
          lastReceivedAt: rawWebhook.lastReceivedAt || undefined,
          createdAt: rawWebhook.createdAt,
          updatedAt: rawWebhook.updatedAt,
          version: rawWebhook.version,
        })
      : undefined;

    const templates = rawTemplates.map(
      (t) =>
        new ChannelTemplate(t.id, {
          tenantId: t.tenantId,
          channelId: t.channelId,
          templateName: t.templateName,
          templateType: t.templateType,
          templateContent: t.templateContent,
          variables: (t.variables as Record<string, any>) || {},
          isActive: !!t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          version: t.version,
        }),
    );

    const rateLimit = rawRateLimit
      ? new ChannelRateLimit(rawRateLimit.id, {
          tenantId: rawRateLimit.tenantId,
          channelId: rawRateLimit.channelId,
          providerLimit: rawRateLimit.providerLimit,
          tenantLimit: rawRateLimit.tenantLimit,
          currentUsage: rawRateLimit.currentUsage,
          resetAt: rawRateLimit.resetAt,
          createdAt: rawRateLimit.createdAt,
          updatedAt: rawRateLimit.updatedAt,
          version: rawRateLimit.version,
        })
      : undefined;

    return new Channel(rawChannel.id, {
      tenantId: rawChannel.tenantId,
      name: rawChannel.name,
      type,
      status,
      provider,
      isActive: !!rawChannel.isActive,
      isDefault: !!rawChannel.isDefault,
      metadata: (rawChannel.metadata as Record<string, any>) || {},
      createdAt: rawChannel.createdAt,
      updatedAt: rawChannel.updatedAt,
      deletedAt: rawChannel.deletedAt || undefined,
      version: rawChannel.version || 1,
      configuration,
      webhook,
      templates,
      rateLimit,
    });
  }
}

@Injectable()
export class DrizzleChannelRepository implements IChannelRepository {
  async findById(id: string, tenantId: string): Promise<Channel | null> {
    const [rawChannel] = await db
      .select()
      .from(schema.channels)
      .where(
        and(
          eq(schema.channels.id, id),
          eq(schema.channels.tenantId, tenantId),
          sql`${schema.channels.deletedAt} IS NULL`,
        ),
      );

    if (!rawChannel) return null;

    const [rawConfig] = await db
      .select()
      .from(schema.channelConfigurations)
      .where(
        and(
          eq(schema.channelConfigurations.channelId, id),
          eq(schema.channelConfigurations.tenantId, tenantId),
        ),
      );

    const [rawWebhook] = await db
      .select()
      .from(schema.channelWebhooks)
      .where(
        and(
          eq(schema.channelWebhooks.channelId, id),
          eq(schema.channelWebhooks.tenantId, tenantId),
        ),
      );

    const rawTemplates = await db
      .select()
      .from(schema.channelTemplates)
      .where(
        and(
          eq(schema.channelTemplates.channelId, id),
          eq(schema.channelTemplates.tenantId, tenantId),
        ),
      );

    const [rawRateLimit] = await db
      .select()
      .from(schema.channelRateLimits)
      .where(
        and(
          eq(schema.channelRateLimits.channelId, id),
          eq(schema.channelRateLimits.tenantId, tenantId),
        ),
      );

    return ChannelMapper.toDomain(
      rawChannel,
      rawConfig,
      rawWebhook,
      rawTemplates,
      rawRateLimit,
    );
  }

  async findByName(name: string, tenantId: string): Promise<Channel | null> {
    const [rawChannel] = await db
      .select()
      .from(schema.channels)
      .where(
        and(
          eq(schema.channels.name, name),
          eq(schema.channels.tenantId, tenantId),
          sql`${schema.channels.deletedAt} IS NULL`,
        ),
      );

    if (!rawChannel) return null;
    return this.findById(rawChannel.id, tenantId);
  }

  async findAll(tenantId: string): Promise<Channel[]> {
    const rawChannels = await db
      .select()
      .from(schema.channels)
      .where(
        and(
          eq(schema.channels.tenantId, tenantId),
          sql`${schema.channels.deletedAt} IS NULL`,
        ),
      );

    const result: Channel[] = [];
    for (const raw of rawChannels) {
      const channel = await this.findById(raw.id, tenantId);
      if (channel) result.push(channel);
    }
    return result;
  }

  async findPaginated(
    tenantId: string,
    options: ChannelQueryOptions,
  ): Promise<{ data: Channel[]; total: number }> {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.channels.tenantId, tenantId),
      sql`${schema.channels.deletedAt} IS NULL`,
    ];

    if (options.type) {
      conditions.push(eq(schema.channels.type, options.type));
    }

    if (options.search) {
      conditions.push(ilike(schema.channels.name, `%${options.search}%`));
    }

    const whereClause = and(...conditions);
    const order =
      options.sortOrder === 'DESC'
        ? desc(schema.channels.createdAt)
        : asc(schema.channels.createdAt);

    const rawChannels = await db
      .select()
      .from(schema.channels)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.channels)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    const data: Channel[] = [];
    for (const raw of rawChannels) {
      const channel = await this.findById(raw.id, tenantId);
      if (channel) data.push(channel);
    }

    return { data, total };
  }

  async save(channel: Channel, tenantId: string): Promise<Channel> {
    const raw = {
      id: channel.id,
      tenantId: channel.tenantId,
      name: channel.name,
      type: channel.type.value,
      status: channel.status.value,
      provider: channel.provider.value,
      isActive: channel.isActive,
      isDefault: channel.isDefault,
      metadata: channel.metadata || null,
      updatedAt: new Date(),
      deletedAt: channel.deletedAt || null,
      version: channel.version,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.channels)
        .where(
          and(
            eq(schema.channels.id, channel.id),
            eq(schema.channels.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.channels)
          .set(raw)
          .where(
            and(
              eq(schema.channels.id, channel.id),
              eq(schema.channels.tenantId, tenantId),
            ),
          );
      } else {
        await tx.insert(schema.channels).values({
          ...raw,
          createdAt: channel.createdAt,
          updatedAt: channel.createdAt,
        });
      }

      if (channel.configuration) {
        await this.saveConfigInternal(tx, channel.configuration, tenantId);
      }

      if (channel.webhook) {
        await this.saveWebhookInternal(tx, channel.webhook, tenantId);
      }

      if (channel.rateLimit) {
        await this.saveRateLimitInternal(tx, channel.rateLimit, tenantId);
      }
    });

    return channel;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.channels)
      .where(
        and(eq(schema.channels.id, id), eq(schema.channels.tenantId, tenantId)),
      );

    if (!existing) return false;

    await db
      .update(schema.channels)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(
        and(eq(schema.channels.id, id), eq(schema.channels.tenantId, tenantId)),
      );

    return true;
  }

  async findConfigByChannelId(
    channelId: string,
    tenantId: string,
  ): Promise<ChannelConfiguration | null> {
    const [row] = await db
      .select()
      .from(schema.channelConfigurations)
      .where(
        and(
          eq(schema.channelConfigurations.channelId, channelId),
          eq(schema.channelConfigurations.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return new ChannelConfiguration(row.id, {
      tenantId: row.tenantId,
      channelId: row.channelId,
      authenticationType: row.authenticationType,
      configuration: (row.configuration as Record<string, any>) || {},
      credentials: (row.credentials as Record<string, any>) || {},
      settings: (row.settings as Record<string, any>) || {},
      healthStatus: row.healthStatus,
      lastHealthCheck: row.lastHealthCheck || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async saveConfig(
    config: ChannelConfiguration,
    tenantId: string,
  ): Promise<void> {
    await this.saveConfigInternal(db, config, tenantId);
  }

  private async saveConfigInternal(
    txOrDb: any,
    config: ChannelConfiguration,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: config.id,
      tenantId: config.tenantId,
      channelId: config.channelId,
      authenticationType: config.authenticationType,
      configuration: config.configuration,
      credentials: config.credentials,
      settings: config.settings,
      healthStatus: config.healthStatus,
      lastHealthCheck: config.lastHealthCheck,
      updatedAt: new Date(),
      version: config.version,
    };

    const [existing] = await txOrDb
      .select()
      .from(schema.channelConfigurations)
      .where(
        and(
          eq(schema.channelConfigurations.id, config.id),
          eq(schema.channelConfigurations.tenantId, tenantId),
        ),
      );

    if (existing) {
      await txOrDb
        .update(schema.channelConfigurations)
        .set(raw)
        .where(
          and(
            eq(schema.channelConfigurations.id, config.id),
            eq(schema.channelConfigurations.tenantId, tenantId),
          ),
        );
    } else {
      await txOrDb.insert(schema.channelConfigurations).values({
        ...raw,
        createdAt: config.createdAt,
        updatedAt: config.createdAt,
      });
    }
  }

  async findWebhookByChannelId(
    channelId: string,
    tenantId: string,
  ): Promise<ChannelWebhook | null> {
    const [row] = await db
      .select()
      .from(schema.channelWebhooks)
      .where(
        and(
          eq(schema.channelWebhooks.channelId, channelId),
          eq(schema.channelWebhooks.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return new ChannelWebhook(row.id, {
      tenantId: row.tenantId,
      channelId: row.channelId,
      webhookUrl: row.webhookUrl,
      webhookSecret: row.webhookSecret || undefined,
      verificationToken: row.verificationToken || undefined,
      status: row.status,
      lastReceivedAt: row.lastReceivedAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async saveWebhook(webhook: ChannelWebhook, tenantId: string): Promise<void> {
    await this.saveWebhookInternal(db, webhook, tenantId);
  }

  private async saveWebhookInternal(
    txOrDb: any,
    webhook: ChannelWebhook,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: webhook.id,
      tenantId: webhook.tenantId,
      channelId: webhook.channelId,
      webhookUrl: webhook.webhookUrl,
      webhookSecret: webhook.webhookSecret || null,
      verificationToken: webhook.verificationToken || null,
      status: webhook.status,
      lastReceivedAt: webhook.lastReceivedAt || null,
      updatedAt: new Date(),
      version: webhook.version,
    };

    const [existing] = await txOrDb
      .select()
      .from(schema.channelWebhooks)
      .where(
        and(
          eq(schema.channelWebhooks.id, webhook.id),
          eq(schema.channelWebhooks.tenantId, tenantId),
        ),
      );

    if (existing) {
      await txOrDb
        .update(schema.channelWebhooks)
        .set(raw)
        .where(
          and(
            eq(schema.channelWebhooks.id, webhook.id),
            eq(schema.channelWebhooks.tenantId, tenantId),
          ),
        );
    } else {
      await txOrDb.insert(schema.channelWebhooks).values({
        ...raw,
        createdAt: webhook.createdAt,
        updatedAt: webhook.createdAt,
      });
    }
  }

  async findTemplatesByChannelId(
    channelId: string,
    tenantId: string,
  ): Promise<ChannelTemplate[]> {
    const rows = await db
      .select()
      .from(schema.channelTemplates)
      .where(
        and(
          eq(schema.channelTemplates.channelId, channelId),
          eq(schema.channelTemplates.tenantId, tenantId),
        ),
      );

    return rows.map(
      (t) =>
        new ChannelTemplate(t.id, {
          tenantId: t.tenantId,
          channelId: t.channelId,
          templateName: t.templateName,
          templateType: t.templateType,
          templateContent: t.templateContent,
          variables: (t.variables as Record<string, any>) || {},
          isActive: !!t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          version: t.version,
        }),
    );
  }

  async findTemplateByName(
    channelId: string,
    name: string,
    tenantId: string,
  ): Promise<ChannelTemplate | null> {
    const [row] = await db
      .select()
      .from(schema.channelTemplates)
      .where(
        and(
          eq(schema.channelTemplates.channelId, channelId),
          eq(schema.channelTemplates.templateName, name),
          eq(schema.channelTemplates.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return new ChannelTemplate(row.id, {
      tenantId: row.tenantId,
      channelId: row.channelId,
      templateName: row.templateName,
      templateType: row.templateType,
      templateContent: row.templateContent,
      variables: (row.variables as Record<string, any>) || {},
      isActive: !!row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async saveTemplate(
    template: ChannelTemplate,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: template.id,
      tenantId: template.tenantId,
      channelId: template.channelId,
      templateName: template.templateName,
      templateType: template.templateType,
      templateContent: template.templateContent,
      variables: template.variables,
      isActive: template.isActive,
      updatedAt: new Date(),
      version: template.version,
    };

    const [existing] = await db
      .select()
      .from(schema.channelTemplates)
      .where(
        and(
          eq(schema.channelTemplates.id, template.id),
          eq(schema.channelTemplates.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.channelTemplates)
        .set(raw)
        .where(
          and(
            eq(schema.channelTemplates.id, template.id),
            eq(schema.channelTemplates.tenantId, tenantId),
          ),
        );
    } else {
      await db.insert(schema.channelTemplates).values({
        ...raw,
        createdAt: template.createdAt,
        updatedAt: template.createdAt,
      });
    }
  }

  async deleteTemplate(
    channelId: string,
    templateName: string,
    tenantId: string,
  ): Promise<void> {
    await db
      .delete(schema.channelTemplates)
      .where(
        and(
          eq(schema.channelTemplates.channelId, channelId),
          eq(schema.channelTemplates.templateName, templateName),
          eq(schema.channelTemplates.tenantId, tenantId),
        ),
      );
  }

  async findRateLimitByChannelId(
    channelId: string,
    tenantId: string,
  ): Promise<ChannelRateLimit | null> {
    const [row] = await db
      .select()
      .from(schema.channelRateLimits)
      .where(
        and(
          eq(schema.channelRateLimits.channelId, channelId),
          eq(schema.channelRateLimits.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return new ChannelRateLimit(row.id, {
      tenantId: row.tenantId,
      channelId: row.channelId,
      providerLimit: row.providerLimit,
      tenantLimit: row.tenantLimit,
      currentUsage: row.currentUsage,
      resetAt: row.resetAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async saveRateLimit(
    rateLimit: ChannelRateLimit,
    tenantId: string,
  ): Promise<void> {
    await this.saveRateLimitInternal(db, rateLimit, tenantId);
  }

  private async saveRateLimitInternal(
    txOrDb: any,
    rateLimit: ChannelRateLimit,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: rateLimit.id,
      tenantId: rateLimit.tenantId,
      channelId: rateLimit.channelId,
      providerLimit: rateLimit.providerLimit,
      tenantLimit: rateLimit.tenantLimit,
      currentUsage: rateLimit.currentUsage,
      resetAt: rateLimit.resetAt,
      updatedAt: new Date(),
      version: rateLimit.version,
    };

    const [existing] = await txOrDb
      .select()
      .from(schema.channelRateLimits)
      .where(
        and(
          eq(schema.channelRateLimits.id, rateLimit.id),
          eq(schema.channelRateLimits.tenantId, tenantId),
        ),
      );

    if (existing) {
      await txOrDb
        .update(schema.channelRateLimits)
        .set(raw)
        .where(
          and(
            eq(schema.channelRateLimits.id, rateLimit.id),
            eq(schema.channelRateLimits.tenantId, tenantId),
          ),
        );
    } else {
      await txOrDb.insert(schema.channelRateLimits).values({
        ...raw,
        createdAt: rateLimit.createdAt,
        updatedAt: rateLimit.createdAt,
      });
    }
  }
}
