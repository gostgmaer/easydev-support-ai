import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleSettingsRepository } from '../repositories/drizzle-settings-repository';
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

jest.mock('@easydev/database', () => {
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    then: jest.fn(),
  };
  return {
    db: mockDb,
    schema: {
      tenantSettings: { id: 'id', tenantId: 'tenantId' },
      tenantBranding: { id: 'id', tenantId: 'tenantId' },
      tenantPreferences: { id: 'id', tenantId: 'tenantId' },
      tenantBusinessHours: {
        id: 'id',
        tenantId: 'tenantId',
        dayOfWeek: 'dayOfWeek',
      },
      tenantHolidays: { id: 'id', tenantId: 'tenantId' },
      tenantFeatureFlags: {
        id: 'id',
        tenantId: 'tenantId',
        featureKey: 'featureKey',
      },
      tenantAiSettings: { id: 'id', tenantId: 'tenantId' },
      tenantChannelSettings: {
        id: 'id',
        tenantId: 'tenantId',
        channelType: 'channelType',
      },
      tenantNotificationSettings: { id: 'id', tenantId: 'tenantId' },
      tenantSlaSettings: { id: 'id', tenantId: 'tenantId' },
      tenantSecuritySettings: { id: 'id', tenantId: 'tenantId' },
      tenantWidgetSettings: { id: 'id', tenantId: 'tenantId' },
      tenantUsageLimits: { id: 'id', tenantId: 'tenantId' },
    },
  };
});

import { db } from '@easydev/database';
const mockDbInstance = db as any;

function mockDbResolve(value: any) {
  mockDbInstance.then.mockImplementation((onfulfilled: any) => {
    return Promise.resolve(value).then(onfulfilled);
  });
}

describe('DrizzleSettingsRepository', () => {
  let repository: DrizzleSettingsRepository;
  const tenantId = 'tenant-123';

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrizzleSettingsRepository],
    }).compile();

    repository = module.get<DrizzleSettingsRepository>(
      DrizzleSettingsRepository,
    );
  });

  describe('TenantSettings', () => {
    it('should insert a new tenant settings if it does not exist', async () => {
      mockDbResolve([]);
      const entity = new TenantSettings('id1', {
        tenantId,
        tenantName: 'Test Tenant',
        timezone: 'UTC',
        locale: 'en',
        currency: 'USD',
        status: 'ACTIVE',
      });
      await repository.saveSettings(entity);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update tenant settings if it exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const entity = new TenantSettings('id1', {
        tenantId,
        tenantName: 'Test Tenant',
        timezone: 'UTC',
        locale: 'en',
        currency: 'USD',
        status: 'ACTIVE',
      });
      await repository.saveSettings(entity);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get tenant settings by tenantId', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          tenantName: 'Test Tenant',
          timezone: 'UTC',
          locale: 'en',
          currency: 'USD',
          status: 'ACTIVE',
        },
      ]);
      const res = await repository.getSettingsByTenant(tenantId);
      expect(res).toBeDefined();
      expect(res!.tenantName).toBe('Test Tenant');
    });

    it('should return null if tenant settings not found', async () => {
      mockDbResolve([]);
      const res = await repository.getSettingsByTenant(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('BrandingSettings', () => {
    it('should insert branding if not exists', async () => {
      mockDbResolve([]);
      const branding = new BrandingSettings('id1', {
        tenantId,
        primaryColor: '#1A73E8',
        secondaryColor: '#E8F0FE',
        themeMode: 'LIGHT',
      });
      await repository.saveBranding(branding);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update branding if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const branding = new BrandingSettings('id1', {
        tenantId,
        primaryColor: '#1A73E8',
        secondaryColor: '#E8F0FE',
        themeMode: 'LIGHT',
      });
      await repository.saveBranding(branding);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get branding', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          primaryColor: '#1A73E8',
          secondaryColor: '#E8F0FE',
          themeMode: 'LIGHT',
        },
      ]);
      const res = await repository.getBranding(tenantId);
      expect(res).toBeDefined();
      expect(res!.primaryColor).toBe('#1A73E8');
    });

    it('should return null if branding not found', async () => {
      mockDbResolve([]);
      const res = await repository.getBranding(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('TenantPreferences', () => {
    it('should insert preferences if not exists', async () => {
      mockDbResolve([]);
      const prefs = new TenantPreferences('id1', {
        tenantId,
        theme: 'LIGHT',
        notificationsEnabled: true,
        autoResolveDays: 3,
        autoCloseDays: 7,
      });
      await repository.savePreferences(prefs);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update preferences if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const prefs = new TenantPreferences('id1', {
        tenantId,
        theme: 'LIGHT',
        notificationsEnabled: true,
        autoResolveDays: 3,
        autoCloseDays: 7,
      });
      await repository.savePreferences(prefs);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get preferences', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          theme: 'LIGHT',
          notificationsEnabled: true,
          autoResolveDays: 3,
          autoCloseDays: 7,
        },
      ]);
      const res = await repository.getPreferences(tenantId);
      expect(res).toBeDefined();
      expect(res!.theme).toBe('LIGHT');
    });

    it('should return null if preferences not found', async () => {
      mockDbResolve([]);
      const res = await repository.getPreferences(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('BusinessHours', () => {
    it('should insert business hours if not exists', async () => {
      mockDbResolve([]);
      const bh = new BusinessHours('id1', {
        tenantId,
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      await repository.saveBusinessHours(bh);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update business hours if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId, dayOfWeek: 1 }]);
      const bh = new BusinessHours('id1', {
        tenantId,
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      await repository.saveBusinessHours(bh);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should list business hours', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          dayOfWeek: 1,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isOpen: true,
          timezone: 'UTC',
        },
      ]);
      const res = await repository.getBusinessHours(tenantId);
      expect(res.length).toBe(1);
    });

    it('should delete business hours', async () => {
      mockDbResolve([]);
      await repository.deleteBusinessHours('id1', tenantId);
      expect(mockDbInstance.delete).toHaveBeenCalled();
    });
  });

  describe('Holidays', () => {
    it('should insert holiday if not exists', async () => {
      mockDbResolve([]);
      const hol = new Holiday('id1', {
        tenantId,
        holidayName: 'Christmas',
        holidayDate: new Date('2026-12-25'),
        isRecurring: true,
      });
      await repository.saveHoliday(hol);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update holiday if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const hol = new Holiday('id1', {
        tenantId,
        holidayName: 'Christmas',
        holidayDate: new Date('2026-12-25'),
        isRecurring: true,
      });
      await repository.saveHoliday(hol);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should list holidays', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          holidayName: 'Christmas',
          holidayDate: new Date('2026-12-25'),
          isRecurring: true,
        },
      ]);
      const res = await repository.getHolidays(tenantId);
      expect(res.length).toBe(1);
    });

    it('should delete holiday', async () => {
      mockDbResolve([]);
      await repository.deleteHoliday('id1', tenantId);
      expect(mockDbInstance.delete).toHaveBeenCalled();
    });
  });

  describe('FeatureFlags', () => {
    it('should insert feature flag if not exists', async () => {
      mockDbResolve([]);
      const flag = new FeatureFlag('id1', {
        tenantId,
        featureKey: 'my_flag',
        enabled: true,
        rolloutPercentage: 100,
      });
      await repository.saveFeatureFlag(flag);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update feature flag if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const flag = new FeatureFlag('id1', {
        tenantId,
        featureKey: 'my_flag',
        enabled: true,
        rolloutPercentage: 100,
      });
      await repository.saveFeatureFlag(flag);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should list feature flags', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          featureKey: 'my_flag',
          enabled: true,
          rolloutPercentage: 100,
        },
      ]);
      const res = await repository.getFeatureFlags(tenantId);
      expect(res.length).toBe(1);
    });

    it('should get feature flag by key', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          featureKey: 'my_flag',
          enabled: true,
          rolloutPercentage: 100,
        },
      ]);
      const res = await repository.getFeatureFlagByKey(tenantId, 'my_flag');
      expect(res).toBeDefined();
      expect(res!.featureKey).toBe('my_flag');
    });

    it('should return null if feature flag by key not found', async () => {
      mockDbResolve([]);
      const res = await repository.getFeatureFlagByKey(tenantId, 'my_flag');
      expect(res).toBeNull();
    });

    it('should delete feature flag', async () => {
      mockDbResolve([]);
      await repository.deleteFeatureFlag('id1', tenantId);
      expect(mockDbInstance.delete).toHaveBeenCalled();
    });
  });

  describe('AiSettings', () => {
    it('should insert AI settings if not exists', async () => {
      mockDbResolve([]);
      const ai = new AiSettings('id1', {
        tenantId,
        confidenceThreshold: 0.7,
        escalationThreshold: 0.4,
        allowedLanguages: ['en'],
        defaultLanguage: 'en',
        autoResponseEnabled: true,
        autoEscalationEnabled: true,
      });
      await repository.saveAiSettings(ai);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update AI settings if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const ai = new AiSettings('id1', {
        tenantId,
        confidenceThreshold: 0.7,
        escalationThreshold: 0.4,
        allowedLanguages: ['en'],
        defaultLanguage: 'en',
        autoResponseEnabled: true,
        autoEscalationEnabled: true,
      });
      await repository.saveAiSettings(ai);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get AI settings', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          confidenceThreshold: '0.7',
          escalationThreshold: '0.4',
          allowedLanguages: ['en'],
          defaultLanguage: 'en',
          autoResponseEnabled: true,
          autoEscalationEnabled: true,
          costLimitDaily: '10.0',
          costLimitMonthly: '300.0',
        },
      ]);
      const res = await repository.getAiSettings(tenantId);
      expect(res).toBeDefined();
      expect(res!.confidenceThreshold).toBe(0.7);
      expect(res!.costLimitDaily).toBe(10.0);
    });

    it('should return null if AI settings not found', async () => {
      mockDbResolve([]);
      const res = await repository.getAiSettings(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('ChannelSettings', () => {
    it('should insert channel settings if not exists', async () => {
      mockDbResolve([]);
      const chan = new ChannelSettings('id1', {
        tenantId,
        channelType: 'EMAIL',
        enabled: true,
        businessHoursOnly: false,
        autoAssignmentEnabled: true,
      });
      await repository.saveChannelSettings(chan);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update channel settings if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId, channelType: 'EMAIL' }]);
      const chan = new ChannelSettings('id1', {
        tenantId,
        channelType: 'EMAIL',
        enabled: true,
        businessHoursOnly: false,
        autoAssignmentEnabled: true,
      });
      await repository.saveChannelSettings(chan);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get channel settings list', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          channelType: 'EMAIL',
          enabled: true,
          businessHoursOnly: false,
          autoAssignmentEnabled: true,
        },
      ]);
      const res = await repository.getChannelSettings(tenantId);
      expect(res.length).toBe(1);
    });

    it('should get channel settings by type', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          channelType: 'EMAIL',
          enabled: true,
          businessHoursOnly: false,
          autoAssignmentEnabled: true,
        },
      ]);
      const res = await repository.getChannelSettingsByType(tenantId, 'EMAIL');
      expect(res).toBeDefined();
      expect(res!.channelType).toBe('EMAIL');
    });

    it('should return null if channel settings by type not found', async () => {
      mockDbResolve([]);
      const res = await repository.getChannelSettingsByType(tenantId, 'EMAIL');
      expect(res).toBeNull();
    });
  });

  describe('NotificationSettings', () => {
    it('should insert notification settings if not exists', async () => {
      mockDbResolve([]);
      const entity = new NotificationSettings('id1', {
        tenantId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        webhookEnabled: false,
        digestEnabled: false,
      });
      await repository.saveNotificationSettings(entity);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update notification settings if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const entity = new NotificationSettings('id1', {
        tenantId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        webhookEnabled: false,
        digestEnabled: false,
      });
      await repository.saveNotificationSettings(entity);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get notification settings', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          webhookEnabled: false,
          digestEnabled: false,
        },
      ]);
      const res = await repository.getNotificationSettings(tenantId);
      expect(res).toBeDefined();
      expect(res!.emailEnabled).toBe(true);
    });

    it('should return null if notification settings not found', async () => {
      mockDbResolve([]);
      const res = await repository.getNotificationSettings(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('SlaSettings', () => {
    it('should insert SLA settings if not exists', async () => {
      mockDbResolve([]);
      const entity = new SlaSettings('id1', {
        tenantId,
        responseTimeTarget: 3600,
        resolutionTimeTarget: 86400,
        escalationTimeTarget: 14400,
        businessHoursOnly: true,
      });
      await repository.saveSlaSettings(entity);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update SLA settings if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const entity = new SlaSettings('id1', {
        tenantId,
        responseTimeTarget: 3600,
        resolutionTimeTarget: 86400,
        escalationTimeTarget: 14400,
        businessHoursOnly: true,
      });
      await repository.saveSlaSettings(entity);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get SLA settings', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          responseTimeTarget: 3600,
          resolutionTimeTarget: 86400,
          escalationTimeTarget: 14400,
          businessHoursOnly: true,
        },
      ]);
      const res = await repository.getSlaSettings(tenantId);
      expect(res).toBeDefined();
      expect(res!.responseTimeTarget).toBe(3600);
    });

    it('should return null if SLA settings not found', async () => {
      mockDbResolve([]);
      const res = await repository.getSlaSettings(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('SecuritySettings', () => {
    it('should insert security settings if not exists', async () => {
      mockDbResolve([]);
      const entity = new SecuritySettings('id1', {
        tenantId,
        sessionTimeout: 3600,
        ipWhitelist: [],
        mfaRequired: false,
        apiKeyRotationDays: 90,
        auditRetentionDays: 365,
      });
      await repository.saveSecuritySettings(entity);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update security settings if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const entity = new SecuritySettings('id1', {
        tenantId,
        sessionTimeout: 3600,
        ipWhitelist: [],
        mfaRequired: false,
        apiKeyRotationDays: 90,
        auditRetentionDays: 365,
      });
      await repository.saveSecuritySettings(entity);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get security settings', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          sessionTimeout: 3600,
          ipWhitelist: [],
          mfaRequired: false,
          apiKeyRotationDays: 90,
          auditRetentionDays: 365,
        },
      ]);
      const res = await repository.getSecuritySettings(tenantId);
      expect(res).toBeDefined();
      expect(res!.sessionTimeout).toBe(3600);
    });

    it('should return null if security settings not found', async () => {
      mockDbResolve([]);
      const res = await repository.getSecuritySettings(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('WidgetSettings', () => {
    it('should insert widget settings if not exists', async () => {
      mockDbResolve([]);
      const entity = new WidgetSettings('id1', {
        tenantId,
        widgetName: 'Live Support',
        widgetColor: '#1A73E8',
        widgetPosition: 'BOTTOM_RIGHT',
      });
      await repository.saveWidgetSettings(entity);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update widget settings if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const entity = new WidgetSettings('id1', {
        tenantId,
        widgetName: 'Live Support',
        widgetColor: '#1A73E8',
        widgetPosition: 'BOTTOM_RIGHT',
      });
      await repository.saveWidgetSettings(entity);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get widget settings', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          widgetName: 'Live Support',
          widgetColor: '#1A73E8',
          widgetPosition: 'BOTTOM_RIGHT',
        },
      ]);
      const res = await repository.getWidgetSettings(tenantId);
      expect(res).toBeDefined();
      expect(res!.widgetName).toBe('Live Support');
    });

    it('should return null if widget settings not found', async () => {
      mockDbResolve([]);
      const res = await repository.getWidgetSettings(tenantId);
      expect(res).toBeNull();
    });
  });

  describe('UsageLimits', () => {
    it('should insert usage limits if not exists', async () => {
      mockDbResolve([]);
      const entity = new UsageLimits('id1', {
        tenantId,
        maxAgents: 10,
        maxConversations: 1000,
        maxMessages: 10000,
        maxWorkflows: 5,
        maxConnectors: 3,
        maxDocuments: 50,
        maxStorage: 1073741824,
        maxAiRequests: 5000,
      });
      await repository.saveUsageLimits(entity);
      expect(mockDbInstance.insert).toHaveBeenCalled();
    });

    it('should update usage limits if exists', async () => {
      mockDbResolve([{ id: 'id1', tenantId }]);
      const entity = new UsageLimits('id1', {
        tenantId,
        maxAgents: 10,
        maxConversations: 1000,
        maxMessages: 10000,
        maxWorkflows: 5,
        maxConnectors: 3,
        maxDocuments: 50,
        maxStorage: 1073741824,
        maxAiRequests: 5000,
      });
      await repository.saveUsageLimits(entity);
      expect(mockDbInstance.update).toHaveBeenCalled();
    });

    it('should get usage limits', async () => {
      mockDbResolve([
        {
          id: 'id1',
          tenantId,
          maxAgents: 10,
          maxConversations: 1000,
          maxMessages: 10000,
          maxWorkflows: 5,
          maxConnectors: 3,
          maxDocuments: 50,
          maxStorage: '1073741824',
          maxAiRequests: 5000,
        },
      ]);
      const res = await repository.getUsageLimits(tenantId);
      expect(res).toBeDefined();
      expect(res!.maxAgents).toBe(10);
    });

    it('should return null if usage limits not found', async () => {
      mockDbResolve([]);
      const res = await repository.getUsageLimits(tenantId);
      expect(res).toBeNull();
    });
  });
});
