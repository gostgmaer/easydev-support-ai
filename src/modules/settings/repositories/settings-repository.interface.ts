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

export interface ISettingsRepository {
  saveSettings(settings: TenantSettings): Promise<void>;
  getSettingsByTenant(tenantId: string): Promise<TenantSettings | null>;

  saveBranding(branding: BrandingSettings): Promise<void>;
  getBranding(tenantId: string): Promise<BrandingSettings | null>;

  savePreferences(prefs: TenantPreferences): Promise<void>;
  getPreferences(tenantId: string): Promise<TenantPreferences | null>;

  saveBusinessHours(hours: BusinessHours): Promise<void>;
  getBusinessHours(tenantId: string): Promise<BusinessHours[]>;
  deleteBusinessHours(id: string, tenantId: string): Promise<void>;

  saveHoliday(holiday: Holiday): Promise<void>;
  getHolidays(tenantId: string): Promise<Holiday[]>;
  deleteHoliday(id: string, tenantId: string): Promise<void>;

  saveFeatureFlag(flag: FeatureFlag): Promise<void>;
  getFeatureFlags(tenantId: string): Promise<FeatureFlag[]>;
  getFeatureFlagByKey(
    tenantId: string,
    key: string,
  ): Promise<FeatureFlag | null>;
  deleteFeatureFlag(id: string, tenantId: string): Promise<void>;

  saveAiSettings(ai: AiSettings): Promise<void>;
  getAiSettings(tenantId: string): Promise<AiSettings | null>;

  saveChannelSettings(chan: ChannelSettings): Promise<void>;
  getChannelSettings(tenantId: string): Promise<ChannelSettings[]>;
  getChannelSettingsByType(
    tenantId: string,
    type: string,
  ): Promise<ChannelSettings | null>;

  saveNotificationSettings(notif: NotificationSettings): Promise<void>;
  getNotificationSettings(
    tenantId: string,
  ): Promise<NotificationSettings | null>;

  saveSlaSettings(sla: SlaSettings): Promise<void>;
  getSlaSettings(tenantId: string): Promise<SlaSettings | null>;

  saveSecuritySettings(sec: SecuritySettings): Promise<void>;
  getSecuritySettings(tenantId: string): Promise<SecuritySettings | null>;

  saveWidgetSettings(widget: WidgetSettings): Promise<void>;
  getWidgetSettings(tenantId: string): Promise<WidgetSettings | null>;

  saveUsageLimits(limits: UsageLimits): Promise<void>;
  getUsageLimits(tenantId: string): Promise<UsageLimits | null>;
}
