import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

// Import services
import { TenantSettingsService } from '../services/tenant-settings.service';
import { BrandingService } from '../services/branding.service';
import { BusinessHoursService } from '../services/business-hours.service';
import { HolidayService } from '../services/holiday.service';
import { FeatureFlagService } from '../services/feature-flag.service';
import { AiSettingsService } from '../services/ai-settings.service';
import { ChannelSettingsService } from '../services/channel-settings.service';
import { NotificationSettingsService } from '../services/notification-settings.service';
import { SlaSettingsService } from '../services/sla-settings.service';
import { SecuritySettingsService } from '../services/security-settings.service';
import { WidgetSettingsService } from '../services/widget-settings.service';
import { UsageLimitService } from '../services/usage-limit.service';
import { SettingsEventPublisher } from '../services/settings-event.publisher';

// Import engines
import { FeatureFlagEngine } from '../engines/feature-flag.engine';
import { BusinessHoursEngine } from '../engines/business-hours.engine';

// Import controllers
import { TenantSettingsController } from '../controllers/tenant-settings.controller';
import { BrandingController } from '../controllers/branding.controller';
import { BusinessHoursController } from '../controllers/business-hours.controller';
import { HolidayController } from '../controllers/holiday.controller';
import { FeatureFlagController } from '../controllers/feature-flag.controller';
import { AiSettingsController } from '../controllers/ai-settings.controller';
import { ChannelSettingsController } from '../controllers/channel-settings.controller';
import { NotificationSettingsController } from '../controllers/notification-settings.controller';
import { SlaSettingsController } from '../controllers/sla-settings.controller';
import { SecuritySettingsController } from '../controllers/security-settings.controller';
import { WidgetSettingsController } from '../controllers/widget-settings.controller';
import { UsageLimitController } from '../controllers/usage-limit.controller';

// Import processor
import { SettingsQueueProcessor } from '../jobs/settings-queue.processor';

import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';
import { Holiday, FeatureFlag } from '../domain/entities';

describe('Settings Module', () => {
  let tenantSettingsService: TenantSettingsService;
  let brandingService: BrandingService;
  let businessHoursService: BusinessHoursService;
  let holidayService: HolidayService;
  let featureFlagService: FeatureFlagService;
  let aiSettingsService: AiSettingsService;
  let channelSettingsService: ChannelSettingsService;
  let notificationSettingsService: NotificationSettingsService;
  let slaSettingsService: SlaSettingsService;
  let securitySettingsService: SecuritySettingsService;
  let widgetSettingsService: WidgetSettingsService;
  let usageLimitService: UsageLimitService;
  let eventPublisher: SettingsEventPublisher;
  let flagEngine: FeatureFlagEngine;
  let hoursEngine: BusinessHoursEngine;
  let queueProcessor: SettingsQueueProcessor;

  // Controllers
  let tenantSettingsController: TenantSettingsController;
  let brandingController: BrandingController;
  let businessHoursController: BusinessHoursController;
  let holidayController: HolidayController;
  let featureFlagController: FeatureFlagController;
  let aiSettingsController: AiSettingsController;
  let channelSettingsController: ChannelSettingsController;
  let notificationSettingsController: NotificationSettingsController;
  let slaSettingsController: SlaSettingsController;
  let securitySettingsController: SecuritySettingsController;
  let widgetSettingsController: WidgetSettingsController;
  let usageLimitController: UsageLimitController;

  const mockRepo = {
    saveSettings: jest.fn(),
    getSettingsByTenant: jest.fn(),
    saveBranding: jest.fn(),
    getBranding: jest.fn(),
    savePreferences: jest.fn(),
    getPreferences: jest.fn(),
    saveBusinessHours: jest.fn(),
    getBusinessHours: jest.fn(),
    deleteBusinessHours: jest.fn(),
    saveHoliday: jest.fn(),
    getHolidays: jest.fn(),
    deleteHoliday: jest.fn(),
    saveFeatureFlag: jest.fn(),
    getFeatureFlags: jest.fn(),
    getFeatureFlagByKey: jest.fn(),
    deleteFeatureFlag: jest.fn(),
    saveAiSettings: jest.fn(),
    getAiSettings: jest.fn(),
    saveChannelSettings: jest.fn(),
    getChannelSettings: jest.fn(),
    getChannelSettingsByType: jest.fn(),
    saveNotificationSettings: jest.fn(),
    getNotificationSettings: jest.fn(),
    saveSlaSettings: jest.fn(),
    getSlaSettings: jest.fn(),
    saveSecuritySettings: jest.fn(),
    getSecuritySettings: jest.fn(),
    saveWidgetSettings: jest.fn(),
    getWidgetSettings: jest.fn(),
    saveUsageLimits: jest.fn(),
    getUsageLimits: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: 'job-id' }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const tenantId = 'test-tenant-id';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        TenantSettingsController,
        BrandingController,
        BusinessHoursController,
        HolidayController,
        FeatureFlagController,
        AiSettingsController,
        ChannelSettingsController,
        NotificationSettingsController,
        SlaSettingsController,
        SecuritySettingsController,
        WidgetSettingsController,
        UsageLimitController,
      ],
      providers: [
        {
          provide: 'ISettingsRepository',
          useValue: mockRepo,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        TenantSettingsService,
        BrandingService,
        BusinessHoursService,
        HolidayService,
        FeatureFlagService,
        AiSettingsService,
        ChannelSettingsService,
        NotificationSettingsService,
        SlaSettingsService,
        SecuritySettingsService,
        WidgetSettingsService,
        UsageLimitService,
        SettingsEventPublisher,
        FeatureFlagEngine,
        BusinessHoursEngine,
        SettingsQueueProcessor,
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    tenantSettingsService = module.get<TenantSettingsService>(
      TenantSettingsService,
    );
    brandingService = module.get<BrandingService>(BrandingService);
    businessHoursService =
      module.get<BusinessHoursService>(BusinessHoursService);
    holidayService = module.get<HolidayService>(HolidayService);
    featureFlagService = module.get<FeatureFlagService>(FeatureFlagService);
    aiSettingsService = module.get<AiSettingsService>(AiSettingsService);
    channelSettingsService = module.get<ChannelSettingsService>(
      ChannelSettingsService,
    );
    notificationSettingsService = module.get<NotificationSettingsService>(
      NotificationSettingsService,
    );
    slaSettingsService = module.get<SlaSettingsService>(SlaSettingsService);
    securitySettingsService = module.get<SecuritySettingsService>(
      SecuritySettingsService,
    );
    widgetSettingsService = module.get<WidgetSettingsService>(
      WidgetSettingsService,
    );
    usageLimitService = module.get<UsageLimitService>(UsageLimitService);
    eventPublisher = module.get<SettingsEventPublisher>(SettingsEventPublisher);
    flagEngine = module.get<FeatureFlagEngine>(FeatureFlagEngine);
    hoursEngine = module.get<BusinessHoursEngine>(BusinessHoursEngine);
    queueProcessor = module.get<SettingsQueueProcessor>(SettingsQueueProcessor);

    // Controllers
    tenantSettingsController = module.get<TenantSettingsController>(
      TenantSettingsController,
    );
    brandingController = module.get<BrandingController>(BrandingController);
    businessHoursController = module.get<BusinessHoursController>(
      BusinessHoursController,
    );
    holidayController = module.get<HolidayController>(HolidayController);
    featureFlagController = module.get<FeatureFlagController>(
      FeatureFlagController,
    );
    aiSettingsController =
      module.get<AiSettingsController>(AiSettingsController);
    channelSettingsController = module.get<ChannelSettingsController>(
      ChannelSettingsController,
    );
    notificationSettingsController = module.get<NotificationSettingsController>(
      NotificationSettingsController,
    );
    slaSettingsController = module.get<SlaSettingsController>(
      SlaSettingsController,
    );
    securitySettingsController = module.get<SecuritySettingsController>(
      SecuritySettingsController,
    );
    widgetSettingsController = module.get<WidgetSettingsController>(
      WidgetSettingsController,
    );
    usageLimitController =
      module.get<UsageLimitController>(UsageLimitController);

    // Trigger onModuleInit manually for engine
    await flagEngine.onModuleInit();
  });

  afterAll(async () => {
    await flagEngine.onModuleDestroy();
  });

  describe('TenantSettings Service & Controller', () => {
    it('should provision default settings if not exists', async () => {
      mockRepo.getSettingsByTenant.mockResolvedValue(null);
      mockRepo.saveSettings.mockResolvedValue(undefined);

      const result = await tenantSettingsController.getSettings(tenantId);
      expect(result).toBeDefined();
      expect(result.tenantId).toBe(tenantId);
      expect(result.timezone).toBe('UTC');
    });

    it('should update settings', async () => {
      mockRepo.getSettingsByTenant.mockResolvedValue({
        id: 'id1',
        tenantId,
        tenantName: 'Name',
        timezone: 'UTC',
        locale: 'en',
        currency: 'USD',
        status: 'ACTIVE',
        toJSON: () => ({ tenantName: 'Updated' }),
        update: jest.fn(),
      });

      const result = await tenantSettingsController.updateSettings(tenantId, {
        tenantName: 'Updated',
      });
      expect(result.tenantName).toBe('Updated');
    });
  });

  describe('Branding Service & Controller', () => {
    it('should provision and update branding', async () => {
      mockRepo.getBranding.mockResolvedValue(null);
      const res = await brandingController.getBranding(tenantId);
      expect(res.primaryColor).toBe('#1A73E8');

      mockRepo.getBranding.mockResolvedValue({
        id: 'id1',
        tenantId,
        primaryColor: '#1A73E8',
        secondaryColor: '#E8F0FE',
        themeMode: 'LIGHT',
        update: jest.fn(),
        toJSON: () => ({ primaryColor: '#FF0000' }),
      });
      const updated = await brandingController.updateBranding(tenantId, {
        primaryColor: '#FF0000',
      });
      expect(updated.primaryColor).toBe('#FF0000');
    });
  });

  describe('BusinessHours Service & Controller', () => {
    it('should provision default business hours if empty', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([]);
      const hours = await businessHoursController.getBusinessHours(tenantId);
      expect(hours.length).toBe(5);
      expect(hours[0].startTime).toBe('09:00:00');
    });

    it('should save business hours', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([]);
      const hour = await businessHoursController.saveBusinessHours(tenantId, {
        dayOfWeek: 1,
        startTime: '08:00:00',
        endTime: '18:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      expect(hour.startTime).toBe('08:00:00');
    });

    it('should delete business hours', async () => {
      const res = await businessHoursController.deleteBusinessHours(
        tenantId,
        'id1',
      );
      expect(res.success).toBe(true);
    });

    it('should check if open now', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([
        {
          dayOfWeek: new Date().getDay(),
          startTime: '00:00:00',
          endTime: '23:59:59',
          isOpen: true,
        },
      ]);
      mockRepo.getHolidays.mockResolvedValue([]);
      const res = await businessHoursController.isOpenNow(tenantId);
      expect(res.isOpen).toBe(true);
    });

    it('should calculate next open time', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([
        {
          dayOfWeek: (new Date().getDay() + 1) % 7,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isOpen: true,
        },
      ]);
      mockRepo.getHolidays.mockResolvedValue([]);
      const res = await businessHoursController.getNextOpenTime(tenantId);
      expect(res.nextOpenTime).not.toBeNull();
    });

    it('should calculate SLA business time target date', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isOpen: true,
        },
      ]);
      mockRepo.getHolidays.mockResolvedValue([]);
      const startDate = new Date('2026-06-22T08:00:00Z');
      const targetDate = await businessHoursService.calculateBusinessSla(
        tenantId,
        startDate,
        3600,
      );
      expect(targetDate).toBeInstanceOf(Date);
      expect(targetDate.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe('Holiday Service & Controller', () => {
    it('should save and list holidays', async () => {
      mockRepo.getHolidays.mockResolvedValue([]);
      const holiday = await holidayController.saveHoliday(tenantId, {
        holidayName: 'New Year',
        holidayDate: '2026-01-01',
        isRecurring: true,
      });
      expect(holiday.holidayName).toBe('New Year');

      const mockHoliday = new Holiday(holiday.id, {
        tenantId,
        holidayName: holiday.holidayName,
        holidayDate: new Date(holiday.holidayDate),
        isRecurring: holiday.isRecurring,
      });
      mockRepo.getHolidays.mockResolvedValue([mockHoliday]);
      const list = await holidayController.getHolidays(tenantId);
      expect(list.length).toBe(1);

      const del = await holidayController.deleteHoliday(tenantId, holiday.id);
      expect(del.success).toBe(true);
    });
  });

  describe('FeatureFlag Service & Controller', () => {
    it('should save feature flags and resolve them', async () => {
      mockRepo.getFeatureFlagByKey.mockResolvedValue(null);
      const flag = await featureFlagController.saveFeatureFlag(tenantId, {
        featureKey: 'test_flag',
        enabled: true,
        rolloutPercentage: 100,
      });
      expect(flag.featureKey).toBe('test_flag');

      const mockFlag = new FeatureFlag(flag.id, {
        tenantId,
        featureKey: flag.featureKey,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        configuration: flag.configuration,
      });

      mockRepo.getFeatureFlags.mockResolvedValue([mockFlag]);
      const list = await featureFlagController.getFeatureFlags(tenantId);
      expect(list.length).toBe(1);

      mockRepo.getFeatureFlagByKey.mockResolvedValue(mockFlag);
      const resolved = await featureFlagController.resolveFlag(
        tenantId,
        'test_flag',
        'user1',
      );
      expect(resolved.enabled).toBe(true);

      const del = await featureFlagController.deleteFeatureFlag(
        tenantId,
        flag.id,
      );
      expect(del.success).toBe(true);
    });

    it('should fallback resolving missing feature flags to false', async () => {
      mockRepo.getFeatureFlagByKey.mockResolvedValue(null);
      const resolved = await featureFlagController.resolveFlag(
        tenantId,
        'missing_flag',
      );
      expect(resolved.enabled).toBe(false);
    });
  });

  describe('AiSettings Service & Controller', () => {
    it('should provision default and update AI settings', async () => {
      mockRepo.getAiSettings.mockResolvedValue(null);
      const res = await aiSettingsController.getAiSettings(tenantId);
      expect(res.confidenceThreshold).toBe(0.7);

      mockRepo.getAiSettings.mockResolvedValue({
        id: 'id1',
        tenantId,
        confidenceThreshold: 0.7,
        escalationThreshold: 0.4,
        allowedLanguages: ['en'],
        defaultLanguage: 'en',
        autoResponseEnabled: true,
        autoEscalationEnabled: true,
        update: jest.fn(),
        toJSON: () => ({ confidenceThreshold: 0.85 }),
      });
      const updated = await aiSettingsController.updateAiSettings(tenantId, {
        confidenceThreshold: 0.85,
      });
      expect(updated.confidenceThreshold).toBe(0.85);
    });
  });

  describe('ChannelSettings Service & Controller', () => {
    it('should provision and update channel configurations', async () => {
      mockRepo.getChannelSettings.mockResolvedValue([]);
      const list = await channelSettingsController.getChannelSettings(tenantId);
      expect(list.length).toBe(2);

      mockRepo.getChannelSettingsByType.mockResolvedValue({
        id: 'id1',
        tenantId,
        channelType: 'EMAIL',
        enabled: true,
        businessHoursOnly: false,
        autoAssignmentEnabled: true,
        update: jest.fn(),
        toJSON: () => ({ channelType: 'EMAIL', enabled: false }),
      });
      const updated = await channelSettingsController.updateChannelSettings(
        tenantId,
        {
          channelType: 'EMAIL',
          enabled: false,
          businessHoursOnly: false,
          autoAssignmentEnabled: true,
        },
      );
      expect(updated.enabled).toBe(false);
    });
  });

  describe('NotificationSettings Service & Controller', () => {
    it('should provision and update notification configurations', async () => {
      mockRepo.getNotificationSettings.mockResolvedValue(null);
      const res =
        await notificationSettingsController.getNotificationSettings(tenantId);
      expect(res.emailEnabled).toBe(true);

      mockRepo.getNotificationSettings.mockResolvedValue({
        id: 'id1',
        tenantId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        webhookEnabled: false,
        digestEnabled: false,
        update: jest.fn(),
        toJSON: () => ({ emailEnabled: false }),
      });
      const updated =
        await notificationSettingsController.updateNotificationSettings(
          tenantId,
          {
            emailEnabled: false,
          },
        );
      expect(updated.emailEnabled).toBe(false);
    });
  });

  describe('SlaSettings Service & Controller', () => {
    it('should provision and update SLA target settings', async () => {
      mockRepo.getSlaSettings.mockResolvedValue(null);
      const res = await slaSettingsController.getSlaSettings(tenantId);
      expect(res.responseTimeTarget).toBe(3600);

      mockRepo.getSlaSettings.mockResolvedValue({
        id: 'id1',
        tenantId,
        responseTimeTarget: 3600,
        resolutionTimeTarget: 86400,
        escalationTimeTarget: 14400,
        businessHoursOnly: true,
        update: jest.fn(),
        toJSON: () => ({ responseTimeTarget: 1800 }),
      });
      const updated = await slaSettingsController.updateSlaSettings(tenantId, {
        responseTimeTarget: 1800,
      });
      expect(updated.responseTimeTarget).toBe(1800);
    });
  });

  describe('SecuritySettings Service & Controller', () => {
    it('should provision and update security configurations', async () => {
      mockRepo.getSecuritySettings.mockResolvedValue(null);
      const res =
        await securitySettingsController.getSecuritySettings(tenantId);
      expect(res.mfaRequired).toBe(false);

      mockRepo.getSecuritySettings.mockResolvedValue({
        id: 'id1',
        tenantId,
        sessionTimeout: 3600,
        ipWhitelist: [],
        mfaRequired: false,
        apiKeyRotationDays: 90,
        auditRetentionDays: 365,
        update: jest.fn(),
        toJSON: () => ({ mfaRequired: true }),
      });
      const updated = await securitySettingsController.updateSecuritySettings(
        tenantId,
        {
          mfaRequired: true,
        },
      );
      expect(updated.mfaRequired).toBe(true);
    });
  });

  describe('WidgetSettings Service & Controller', () => {
    it('should provision and update widget configurations', async () => {
      mockRepo.getWidgetSettings.mockResolvedValue(null);
      const res = await widgetSettingsController.getWidgetSettings(tenantId);
      expect(res.widgetName).toBe('Live Support');

      mockRepo.getWidgetSettings.mockResolvedValue({
        id: 'id1',
        tenantId,
        widgetName: 'Live Support',
        widgetColor: '#1A73E8',
        widgetPosition: 'BOTTOM_RIGHT',
        update: jest.fn(),
        toJSON: () => ({ widgetName: 'Agent Chat' }),
      });
      const updated = await widgetSettingsController.updateWidgetSettings(
        tenantId,
        {
          widgetName: 'Agent Chat',
        },
      );
      expect(updated.widgetName).toBe('Agent Chat');
    });
  });

  describe('UsageLimit Service & Controller', () => {
    it('should provision and update usage limits', async () => {
      mockRepo.getUsageLimits.mockResolvedValue(null);
      const res = await usageLimitController.getUsageLimits(tenantId);
      expect(res.maxAgents).toBe(10);

      mockRepo.getUsageLimits.mockResolvedValue({
        id: 'id1',
        tenantId,
        maxAgents: 10,
        maxConversations: 1000,
        maxMessages: 10000,
        maxWorkflows: 5,
        maxConnectors: 3,
        maxDocuments: 50,
        maxStorage: 1073741824,
        maxAiRequests: 5000,
        update: jest.fn(),
        toJSON: () => ({ maxAgents: 20 }),
      });
      const updated = await usageLimitController.updateUsageLimits(tenantId, {
        maxAgents: 20,
      });
      expect(updated.maxAgents).toBe(20);
    });
  });

  describe('SettingsQueueProcessor', () => {
    it('should handle settings-sync-job successfully', async () => {
      mockRepo.getSettingsByTenant.mockResolvedValue({
        toJSON: () => ({ tenantId }),
      });
      const result = await queueProcessor.handleJob({
        id: 'job1',
        name: 'settings-sync-job',
        data: { tenantId },
      } as any);
      expect(result.success).toBe(true);
    });

    it('should handle feature-flag-refresh-job successfully', async () => {
      const result = await queueProcessor.handleJob({
        id: 'job2',
        name: 'feature-flag-refresh-job',
        data: { tenantId, flagKey: 'flag1' },
      } as any);
      expect(result.success).toBe(true);
    });

    it('should handle usage-limit-job successfully', async () => {
      mockRepo.getUsageLimits.mockResolvedValue({
        toJSON: () => ({ tenantId }),
      });
      const result = await queueProcessor.handleJob({
        id: 'job3',
        name: 'usage-limit-job',
        data: { tenantId },
      } as any);
      expect(result.success).toBe(true);
    });

    it('should handle settings-audit-job successfully', async () => {
      const result = await queueProcessor.handleJob({
        id: 'job4',
        name: 'settings-audit-job',
        data: {
          tenantId,
          eventName: 'settings.updated',
          payload: { foo: 'bar' },
        },
      } as any);
      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw error for unknown jobs', async () => {
      await expect(
        queueProcessor.handleJob({
          id: 'job5',
          name: 'unknown-job',
          data: { tenantId },
        } as any),
      ).rejects.toThrow('Unknown job name: unknown-job');
    });
  });
});
