import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and } from 'drizzle-orm';
import { ISettingsRepository } from './settings-repository.interface';
import {
  TenantSettings,
  BrandingSettings,
  TenantPreferences,
  BusinessHours,
  Holiday,
  FeatureFlag,
  AiSettings,
  ChannelSettings,
  NotificationSettings,
  SlaSettings,
  SecuritySettings,
  WidgetSettings,
  UsageLimits,
} from '../domain/entities';

@Injectable()
export class DrizzleSettingsRepository implements ISettingsRepository {
  // ------------ Tenant Settings ------------
  async saveSettings(settings: TenantSettings): Promise<void> {
    const raw = {
      id: settings.id,
      tenantId: settings.tenantId,
      tenantName: settings.tenantName,
      industry: settings.industry || null,
      timezone: settings.timezone,
      locale: settings.locale,
      country: settings.country || null,
      currency: settings.currency,
      supportEmail: settings.supportEmail || null,
      supportPhone: settings.supportPhone || null,
      websiteUrl: settings.websiteUrl || null,
      status: settings.status,
      metadata: settings.metadata || {},
      updatedAt: new Date(),
      version: settings.version,
    };

    const [existing] = await db
      .select()
      .from(schema.tenantSettings)
      .where(eq(schema.tenantSettings.tenantId, settings.tenantId));

    if (existing) {
      await db
        .update(schema.tenantSettings)
        .set(raw)
        .where(eq(schema.tenantSettings.tenantId, settings.tenantId));
    } else {
      await db.insert(schema.tenantSettings).values({
        ...raw,
        createdAt: settings.createdAt,
      });
    }
  }

  async getSettingsByTenant(tenantId: string): Promise<TenantSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantSettings)
      .where(eq(schema.tenantSettings.tenantId, tenantId));

    if (!row) return null;

    return new TenantSettings(row.id, {
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      industry: row.industry || undefined,
      timezone: row.timezone,
      locale: row.locale,
      country: row.country || undefined,
      currency: row.currency,
      supportEmail: row.supportEmail || undefined,
      supportPhone: row.supportPhone || undefined,
      websiteUrl: row.websiteUrl || undefined,
      status: row.status,
      metadata: (row.metadata as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  // ------------ Branding ------------
  async saveBranding(branding: BrandingSettings): Promise<void> {
    const raw = {
      id: branding.id,
      tenantId: branding.tenantId,
      logoUrl: branding.logoUrl || null,
      faviconUrl: branding.faviconUrl || null,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      themeMode: branding.themeMode,
      emailHeader: branding.emailHeader || null,
      emailFooter: branding.emailFooter || null,
      customCss: branding.customCss || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantBranding)
      .where(eq(schema.tenantBranding.tenantId, branding.tenantId));

    if (existing) {
      await db
        .update(schema.tenantBranding)
        .set(raw)
        .where(eq(schema.tenantBranding.tenantId, branding.tenantId));
    } else {
      await db.insert(schema.tenantBranding).values({
        ...raw,
        createdAt: branding.createdAt,
      });
    }
  }

  async getBranding(tenantId: string): Promise<BrandingSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantBranding)
      .where(eq(schema.tenantBranding.tenantId, tenantId));

    if (!row) return null;

    return new BrandingSettings(row.id, {
      tenantId: row.tenantId,
      logoUrl: row.logoUrl || undefined,
      faviconUrl: row.faviconUrl || undefined,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      themeMode: row.themeMode,
      emailHeader: row.emailHeader || undefined,
      emailFooter: row.emailFooter || undefined,
      customCss: row.customCss || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Preferences ------------
  async savePreferences(prefs: TenantPreferences): Promise<void> {
    const raw = {
      id: prefs.id,
      tenantId: prefs.tenantId,
      theme: prefs.theme,
      notificationsEnabled: prefs.notificationsEnabled,
      autoResolveDays: prefs.autoResolveDays,
      autoCloseDays: prefs.autoCloseDays,
      metadata: prefs.metadata || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantPreferences)
      .where(eq(schema.tenantPreferences.tenantId, prefs.tenantId));

    if (existing) {
      await db
        .update(schema.tenantPreferences)
        .set(raw)
        .where(eq(schema.tenantPreferences.tenantId, prefs.tenantId));
    } else {
      await db.insert(schema.tenantPreferences).values({
        ...raw,
        createdAt: prefs.createdAt,
      });
    }
  }

  async getPreferences(tenantId: string): Promise<TenantPreferences | null> {
    const [row] = await db
      .select()
      .from(schema.tenantPreferences)
      .where(eq(schema.tenantPreferences.tenantId, tenantId));

    if (!row) return null;

    return new TenantPreferences(row.id, {
      tenantId: row.tenantId,
      theme: row.theme,
      notificationsEnabled: row.notificationsEnabled,
      autoResolveDays: row.autoResolveDays,
      autoCloseDays: row.autoCloseDays,
      metadata: (row.metadata as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Business Hours ------------
  async saveBusinessHours(hours: BusinessHours): Promise<void> {
    const raw = {
      id: hours.id,
      tenantId: hours.tenantId,
      dayOfWeek: hours.dayOfWeek,
      startTime: hours.startTime,
      endTime: hours.endTime,
      isOpen: hours.isOpen,
      timezone: hours.timezone,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantBusinessHours)
      .where(
        and(
          eq(schema.tenantBusinessHours.tenantId, hours.tenantId),
          eq(schema.tenantBusinessHours.dayOfWeek, hours.dayOfWeek),
        ),
      );

    if (existing) {
      await db
        .update(schema.tenantBusinessHours)
        .set(raw)
        .where(eq(schema.tenantBusinessHours.id, existing.id));
    } else {
      await db.insert(schema.tenantBusinessHours).values({
        ...raw,
        createdAt: hours.createdAt,
      });
    }
  }

  async getBusinessHours(tenantId: string): Promise<BusinessHours[]> {
    const rows = await db
      .select()
      .from(schema.tenantBusinessHours)
      .where(eq(schema.tenantBusinessHours.tenantId, tenantId));

    return rows.map(
      (row) =>
        new BusinessHours(row.id, {
          tenantId: row.tenantId,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          isOpen: row.isOpen,
          timezone: row.timezone,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async deleteBusinessHours(id: string, tenantId: string): Promise<void> {
    await db
      .delete(schema.tenantBusinessHours)
      .where(
        and(
          eq(schema.tenantBusinessHours.id, id),
          eq(schema.tenantBusinessHours.tenantId, tenantId),
        ),
      );
  }

  // ------------ Holidays ------------
  async saveHoliday(holiday: Holiday): Promise<void> {
    const raw = {
      id: holiday.id,
      tenantId: holiday.tenantId,
      holidayName: holiday.holidayName,
      holidayDate: holiday.holidayDate,
      isRecurring: holiday.isRecurring,
      country: holiday.country || null,
      region: holiday.region || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantHolidays)
      .where(
        and(
          eq(schema.tenantHolidays.id, holiday.id),
          eq(schema.tenantHolidays.tenantId, holiday.tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.tenantHolidays)
        .set(raw)
        .where(eq(schema.tenantHolidays.id, holiday.id));
    } else {
      await db.insert(schema.tenantHolidays).values({
        ...raw,
        createdAt: holiday.createdAt,
      });
    }
  }

  async getHolidays(tenantId: string): Promise<Holiday[]> {
    const rows = await db
      .select()
      .from(schema.tenantHolidays)
      .where(eq(schema.tenantHolidays.tenantId, tenantId));

    return rows.map(
      (row) =>
        new Holiday(row.id, {
          tenantId: row.tenantId,
          holidayName: row.holidayName,
          holidayDate: row.holidayDate,
          isRecurring: row.isRecurring,
          country: row.country || undefined,
          region: row.region || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async deleteHoliday(id: string, tenantId: string): Promise<void> {
    await db
      .delete(schema.tenantHolidays)
      .where(
        and(
          eq(schema.tenantHolidays.id, id),
          eq(schema.tenantHolidays.tenantId, tenantId),
        ),
      );
  }

  // ------------ Feature Flags ------------
  async saveFeatureFlag(flag: FeatureFlag): Promise<void> {
    const raw = {
      id: flag.id,
      tenantId: flag.tenantId,
      featureKey: flag.featureKey,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      configuration: flag.configuration || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantFeatureFlags)
      .where(
        and(
          eq(schema.tenantFeatureFlags.tenantId, flag.tenantId),
          eq(schema.tenantFeatureFlags.featureKey, flag.featureKey),
        ),
      );

    if (existing) {
      await db
        .update(schema.tenantFeatureFlags)
        .set(raw)
        .where(eq(schema.tenantFeatureFlags.id, existing.id));
    } else {
      await db.insert(schema.tenantFeatureFlags).values({
        ...raw,
        createdAt: flag.createdAt,
      });
    }
  }

  async getFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
    const rows = await db
      .select()
      .from(schema.tenantFeatureFlags)
      .where(eq(schema.tenantFeatureFlags.tenantId, tenantId));

    return rows.map(
      (row) =>
        new FeatureFlag(row.id, {
          tenantId: row.tenantId,
          featureKey: row.featureKey,
          enabled: row.enabled,
          rolloutPercentage: row.rolloutPercentage,
          configuration:
            (row.configuration as Record<string, any>) || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async getFeatureFlagByKey(
    tenantId: string,
    key: string,
  ): Promise<FeatureFlag | null> {
    const [row] = await db
      .select()
      .from(schema.tenantFeatureFlags)
      .where(
        and(
          eq(schema.tenantFeatureFlags.tenantId, tenantId),
          eq(schema.tenantFeatureFlags.featureKey, key),
        ),
      );

    if (!row) return null;

    return new FeatureFlag(row.id, {
      tenantId: row.tenantId,
      featureKey: row.featureKey,
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
      configuration: (row.configuration as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async deleteFeatureFlag(id: string, tenantId: string): Promise<void> {
    await db
      .delete(schema.tenantFeatureFlags)
      .where(
        and(
          eq(schema.tenantFeatureFlags.id, id),
          eq(schema.tenantFeatureFlags.tenantId, tenantId),
        ),
      );
  }

  // ------------ AI Settings ------------
  async saveAiSettings(ai: AiSettings): Promise<void> {
    const raw = {
      id: ai.id,
      tenantId: ai.tenantId,
      defaultAgent: ai.defaultAgent || null,
      confidenceThreshold: ai.confidenceThreshold,
      escalationThreshold: ai.escalationThreshold,
      allowedLanguages: ai.allowedLanguages,
      defaultLanguage: ai.defaultLanguage,
      autoResponseEnabled: ai.autoResponseEnabled,
      autoEscalationEnabled: ai.autoEscalationEnabled,
      costLimitDaily: ai.costLimitDaily ? String(ai.costLimitDaily) : null,
      costLimitMonthly: ai.costLimitMonthly
        ? String(ai.costLimitMonthly)
        : null,
      modelConfiguration: ai.modelConfiguration || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantAiSettings)
      .where(eq(schema.tenantAiSettings.tenantId, ai.tenantId));

    if (existing) {
      await db
        .update(schema.tenantAiSettings)
        .set(raw)
        .where(eq(schema.tenantAiSettings.tenantId, ai.tenantId));
    } else {
      await db.insert(schema.tenantAiSettings).values({
        ...raw,
        createdAt: ai.createdAt,
      });
    }
  }

  async getAiSettings(tenantId: string): Promise<AiSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantAiSettings)
      .where(eq(schema.tenantAiSettings.tenantId, tenantId));

    if (!row) return null;

    return new AiSettings(row.id, {
      tenantId: row.tenantId,
      defaultAgent: row.defaultAgent || undefined,
      confidenceThreshold: Number(row.confidenceThreshold),
      escalationThreshold: Number(row.escalationThreshold),
      allowedLanguages: (row.allowedLanguages as string[]) || [],
      defaultLanguage: row.defaultLanguage,
      autoResponseEnabled: row.autoResponseEnabled,
      autoEscalationEnabled: row.autoEscalationEnabled,
      costLimitDaily: row.costLimitDaily
        ? Number(row.costLimitDaily)
        : undefined,
      costLimitMonthly: row.costLimitMonthly
        ? Number(row.costLimitMonthly)
        : undefined,
      modelConfiguration:
        (row.modelConfiguration as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Channel Settings ------------
  async saveChannelSettings(chan: ChannelSettings): Promise<void> {
    const raw = {
      id: chan.id,
      tenantId: chan.tenantId,
      channelType: chan.channelType,
      enabled: chan.enabled,
      businessHoursOnly: chan.businessHoursOnly,
      autoAssignmentEnabled: chan.autoAssignmentEnabled,
      configuration: chan.configuration || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantChannelSettings)
      .where(
        and(
          eq(schema.tenantChannelSettings.tenantId, chan.tenantId),
          eq(schema.tenantChannelSettings.channelType, chan.channelType),
        ),
      );

    if (existing) {
      await db
        .update(schema.tenantChannelSettings)
        .set(raw)
        .where(eq(schema.tenantChannelSettings.id, existing.id));
    } else {
      await db.insert(schema.tenantChannelSettings).values({
        ...raw,
        createdAt: chan.createdAt,
      });
    }
  }

  async getChannelSettings(tenantId: string): Promise<ChannelSettings[]> {
    const rows = await db
      .select()
      .from(schema.tenantChannelSettings)
      .where(eq(schema.tenantChannelSettings.tenantId, tenantId));

    return rows.map(
      (row) =>
        new ChannelSettings(row.id, {
          tenantId: row.tenantId,
          channelType: row.channelType,
          enabled: row.enabled,
          businessHoursOnly: row.businessHoursOnly,
          autoAssignmentEnabled: row.autoAssignmentEnabled,
          configuration:
            (row.configuration as Record<string, any>) || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
    );
  }

  async getChannelSettingsByType(
    tenantId: string,
    type: string,
  ): Promise<ChannelSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantChannelSettings)
      .where(
        and(
          eq(schema.tenantChannelSettings.tenantId, tenantId),
          eq(schema.tenantChannelSettings.channelType, type),
        ),
      );

    if (!row) return null;

    return new ChannelSettings(row.id, {
      tenantId: row.tenantId,
      channelType: row.channelType,
      enabled: row.enabled,
      businessHoursOnly: row.businessHoursOnly,
      autoAssignmentEnabled: row.autoAssignmentEnabled,
      configuration: (row.configuration as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Notification Settings ------------
  async saveNotificationSettings(notif: NotificationSettings): Promise<void> {
    const raw = {
      id: notif.id,
      tenantId: notif.tenantId,
      emailEnabled: notif.emailEnabled,
      smsEnabled: notif.smsEnabled,
      pushEnabled: notif.pushEnabled,
      webhookEnabled: notif.webhookEnabled,
      digestEnabled: notif.digestEnabled,
      configuration: notif.configuration || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantNotificationSettings)
      .where(eq(schema.tenantNotificationSettings.tenantId, notif.tenantId));

    if (existing) {
      await db
        .update(schema.tenantNotificationSettings)
        .set(raw)
        .where(eq(schema.tenantNotificationSettings.tenantId, notif.tenantId));
    } else {
      await db.insert(schema.tenantNotificationSettings).values({
        ...raw,
        createdAt: notif.createdAt,
      });
    }
  }

  async getNotificationSettings(
    tenantId: string,
  ): Promise<NotificationSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantNotificationSettings)
      .where(eq(schema.tenantNotificationSettings.tenantId, tenantId));

    if (!row) return null;

    return new NotificationSettings(row.id, {
      tenantId: row.tenantId,
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      pushEnabled: row.pushEnabled,
      webhookEnabled: row.webhookEnabled,
      digestEnabled: row.digestEnabled,
      configuration: (row.configuration as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ SLA Settings ------------
  async saveSlaSettings(sla: SlaSettings): Promise<void> {
    const raw = {
      id: sla.id,
      tenantId: sla.tenantId,
      responseTimeTarget: sla.responseTimeTarget,
      resolutionTimeTarget: sla.resolutionTimeTarget,
      escalationTimeTarget: sla.escalationTimeTarget,
      businessHoursOnly: sla.businessHoursOnly,
      configuration: sla.configuration || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantSlaSettings)
      .where(eq(schema.tenantSlaSettings.tenantId, sla.tenantId));

    if (existing) {
      await db
        .update(schema.tenantSlaSettings)
        .set(raw)
        .where(eq(schema.tenantSlaSettings.tenantId, sla.tenantId));
    } else {
      await db.insert(schema.tenantSlaSettings).values({
        ...raw,
        createdAt: sla.createdAt,
      });
    }
  }

  async getSlaSettings(tenantId: string): Promise<SlaSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantSlaSettings)
      .where(eq(schema.tenantSlaSettings.tenantId, tenantId));

    if (!row) return null;

    return new SlaSettings(row.id, {
      tenantId: row.tenantId,
      responseTimeTarget: row.responseTimeTarget,
      resolutionTimeTarget: row.resolutionTimeTarget,
      escalationTimeTarget: row.escalationTimeTarget,
      businessHoursOnly: row.businessHoursOnly,
      configuration: (row.configuration as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Security Settings ------------
  async saveSecuritySettings(sec: SecuritySettings): Promise<void> {
    const raw = {
      id: sec.id,
      tenantId: sec.tenantId,
      sessionTimeout: sec.sessionTimeout,
      ipWhitelist: sec.ipWhitelist,
      mfaRequired: sec.mfaRequired,
      apiKeyRotationDays: sec.apiKeyRotationDays,
      auditRetentionDays: sec.auditRetentionDays,
      configuration: sec.configuration || {},
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantSecuritySettings)
      .where(eq(schema.tenantSecuritySettings.tenantId, sec.tenantId));

    if (existing) {
      await db
        .update(schema.tenantSecuritySettings)
        .set(raw)
        .where(eq(schema.tenantSecuritySettings.tenantId, sec.tenantId));
    } else {
      await db.insert(schema.tenantSecuritySettings).values({
        ...raw,
        createdAt: sec.createdAt,
      });
    }
  }

  async getSecuritySettings(
    tenantId: string,
  ): Promise<SecuritySettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantSecuritySettings)
      .where(eq(schema.tenantSecuritySettings.tenantId, tenantId));

    if (!row) return null;

    return new SecuritySettings(row.id, {
      tenantId: row.tenantId,
      sessionTimeout: row.sessionTimeout,
      ipWhitelist: (row.ipWhitelist as string[]) || [],
      mfaRequired: row.mfaRequired,
      apiKeyRotationDays: row.apiKeyRotationDays,
      auditRetentionDays: row.auditRetentionDays,
      configuration: (row.configuration as Record<string, any>) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Widget Settings ------------
  async saveWidgetSettings(widget: WidgetSettings): Promise<void> {
    const raw = {
      id: widget.id,
      tenantId: widget.tenantId,
      widgetName: widget.widgetName,
      widgetColor: widget.widgetColor,
      widgetPosition: widget.widgetPosition,
      welcomeMessage: widget.welcomeMessage || null,
      offlineMessage: widget.offlineMessage || null,
      avatarUrl: widget.avatarUrl || null,
      customCss: widget.customCss || null,
      customJs: widget.customJs || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantWidgetSettings)
      .where(eq(schema.tenantWidgetSettings.tenantId, widget.tenantId));

    if (existing) {
      await db
        .update(schema.tenantWidgetSettings)
        .set(raw)
        .where(eq(schema.tenantWidgetSettings.tenantId, widget.tenantId));
    } else {
      await db.insert(schema.tenantWidgetSettings).values({
        ...raw,
        createdAt: widget.createdAt,
      });
    }
  }

  async getWidgetSettings(tenantId: string): Promise<WidgetSettings | null> {
    const [row] = await db
      .select()
      .from(schema.tenantWidgetSettings)
      .where(eq(schema.tenantWidgetSettings.tenantId, tenantId));

    if (!row) return null;

    return new WidgetSettings(row.id, {
      tenantId: row.tenantId,
      widgetName: row.widgetName,
      widgetColor: row.widgetColor,
      widgetPosition: row.widgetPosition,
      welcomeMessage: row.welcomeMessage || undefined,
      offlineMessage: row.offlineMessage || undefined,
      avatarUrl: row.avatarUrl || undefined,
      customCss: row.customCss || undefined,
      customJs: row.customJs || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Usage Limits ------------
  async saveUsageLimits(limits: UsageLimits): Promise<void> {
    const raw = {
      id: limits.id,
      tenantId: limits.tenantId,
      maxAgents: limits.maxAgents,
      maxConversations: limits.maxConversations,
      maxMessages: limits.maxMessages,
      maxWorkflows: limits.maxWorkflows,
      maxConnectors: limits.maxConnectors,
      maxDocuments: limits.maxDocuments,
      maxStorage: limits.maxStorage,
      maxAiRequests: limits.maxAiRequests,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.tenantUsageLimits)
      .where(eq(schema.tenantUsageLimits.tenantId, limits.tenantId));

    if (existing) {
      await db
        .update(schema.tenantUsageLimits)
        .set(raw)
        .where(eq(schema.tenantUsageLimits.tenantId, limits.tenantId));
    } else {
      await db.insert(schema.tenantUsageLimits).values({
        ...raw,
        createdAt: limits.createdAt,
      });
    }
  }

  async getUsageLimits(tenantId: string): Promise<UsageLimits | null> {
    const [row] = await db
      .select()
      .from(schema.tenantUsageLimits)
      .where(eq(schema.tenantUsageLimits.tenantId, tenantId));

    if (!row) return null;

    return new UsageLimits(row.id, {
      tenantId: row.tenantId,
      maxAgents: row.maxAgents,
      maxConversations: row.maxConversations,
      maxMessages: row.maxMessages,
      maxWorkflows: row.maxWorkflows,
      maxConnectors: row.maxConnectors,
      maxDocuments: row.maxDocuments,
      maxStorage: Number(row.maxStorage),
      maxAiRequests: row.maxAiRequests,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
