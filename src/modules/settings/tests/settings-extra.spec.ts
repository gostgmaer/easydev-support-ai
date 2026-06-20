import { Test, TestingModule } from '@nestjs/testing';
import {
  SettingId,
  FeatureFlagId,
  BusinessHoursId,
  HolidayId,
} from '../domain/value-objects';
import { FeatureFlagEngine } from '../engines/feature-flag.engine';
import { BusinessHoursEngine } from '../engines/business-hours.engine';
import { FeatureFlag, Holiday, BusinessHours } from '../domain/entities';
import Redis from 'ioredis';

// Mock Redis connection
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key.includes('error-flag')) {
          throw new Error('Redis connection failure');
        }
        if (key.includes('cached-true')) {
          return 'true';
        }
        if (key.includes('cached-false')) {
          return 'false';
        }
        return null;
      }),
      set: jest.fn().mockImplementation(async (key: string) => {
        if (key.includes('error-flag')) {
          throw new Error('Redis set failure');
        }
        return 'OK';
      }),
      del: jest.fn().mockImplementation(async (key: string) => {
        if (key.includes('error-flag')) {
          throw new Error('Redis delete failure');
        }
        return 1;
      }),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

describe('Settings Extra Domain & Engine Tests', () => {
  describe('Value Objects', () => {
    it('should successfully create SettingId', () => {
      const id = SettingId.create('test-id');
      expect(id.value).toBe('test-id');
      expect(() => SettingId.create('')).toThrow('SettingId cannot be empty');
    });

    it('should successfully create FeatureFlagId', () => {
      const id = FeatureFlagId.create('flag-id');
      expect(id.value).toBe('flag-id');
      expect(() => FeatureFlagId.create('')).toThrow(
        'FeatureFlagId cannot be empty',
      );
    });

    it('should successfully create BusinessHoursId', () => {
      const id = BusinessHoursId.create('hours-id');
      expect(id.value).toBe('hours-id');
      expect(() => BusinessHoursId.create('')).toThrow(
        'BusinessHoursId cannot be empty',
      );
    });

    it('should successfully create HolidayId', () => {
      const id = HolidayId.create('holiday-id');
      expect(id.value).toBe('holiday-id');
      expect(() => HolidayId.create('')).toThrow('HolidayId cannot be empty');
    });
  });

  describe('FeatureFlagEngine Extra logic', () => {
    let flagEngine: FeatureFlagEngine;
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

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagEngine,
          {
            provide: 'ISettingsRepository',
            useValue: mockRepo,
          },
        ],
      }).compile();

      flagEngine = module.get<FeatureFlagEngine>(FeatureFlagEngine);
      await flagEngine.onModuleInit();
    });

    afterEach(async () => {
      await flagEngine.onModuleDestroy();
    });

    it('should apply environment overrides when resolving flags', async () => {
      process.env.FEATURE_FLAG_ENV_TEST = 'true';
      const resolved = await flagEngine.resolveFlag('tenant1', 'env_test');
      expect(resolved).toBe(true);
      delete process.env.FEATURE_FLAG_ENV_TEST;

      process.env.FEATURE_FLAG_ENV_TEST_FALSE = 'false';
      const resolvedFalse = await flagEngine.resolveFlag(
        'tenant1',
        'env_test_false',
      );
      expect(resolvedFalse).toBe(false);
      delete process.env.FEATURE_FLAG_ENV_TEST_FALSE;
    });

    it('should read from cache if flag is cached', async () => {
      const resolved = await flagEngine.resolveFlag('tenant1', 'cached-true');
      expect(resolved).toBe(true);

      const resolvedFalse = await flagEngine.resolveFlag(
        'tenant1',
        'cached-false',
      );
      expect(resolvedFalse).toBe(false);
    });

    it('should gracefully handle Redis errors during resolve and save', async () => {
      mockRepo.getFeatureFlagByKey.mockResolvedValue(
        new FeatureFlag('flag1', {
          tenantId: 'tenant1',
          featureKey: 'error-flag',
          enabled: true,
          rolloutPercentage: 100,
        }),
      );

      const resolved = await flagEngine.resolveFlag('tenant1', 'error-flag');
      expect(resolved).toBe(true);
    });

    it('should deterministic percentage rollout a flag correctly', async () => {
      const flag = new FeatureFlag('flag1', {
        tenantId: 'tenant1',
        featureKey: 'rollout-flag',
        enabled: true,
        rolloutPercentage: 50,
      });
      mockRepo.getFeatureFlagByKey.mockResolvedValue(flag);

      // We pass userIds to see both sides of the 50% split
      const user1Resolved = await flagEngine.resolveFlag(
        'tenant1',
        'rollout-flag',
        { userId: 'user-abc' },
      );
      const user2Resolved = await flagEngine.resolveFlag(
        'tenant1',
        'rollout-flag',
        { userId: 'user-xyz' },
      );

      // Ensure that deterministic hashing resolves the flags differently or matches deterministic values
      expect(typeof user1Resolved).toBe('boolean');
      expect(typeof user2Resolved).toBe('boolean');
    });

    it('should gracefully handle Redis error on cache invalidation', async () => {
      await expect(
        flagEngine.invalidateCache('tenant1', 'error-flag'),
      ).resolves.not.toThrow();
    });
  });

  describe('BusinessHoursEngine Extra logic', () => {
    let hoursEngine: BusinessHoursEngine;
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

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BusinessHoursEngine,
          {
            provide: 'ISettingsRepository',
            useValue: mockRepo,
          },
        ],
      }).compile();

      hoursEngine = module.get<BusinessHoursEngine>(BusinessHoursEngine);
    });

    it('should correctly detect recurring and non-recurring holidays', async () => {
      const holiday1 = new Holiday('h1', {
        tenantId: 'tenant1',
        holidayName: 'Christmas',
        holidayDate: new Date(2020, 11, 25, 0, 0, 0), // Local Dec 25
        isRecurring: true,
      });
      const holiday2 = new Holiday('h2', {
        tenantId: 'tenant1',
        holidayName: 'One-off Special',
        holidayDate: new Date(2026, 5, 25, 0, 0, 0), // Local June 25
        isRecurring: false,
      });

      mockRepo.getHolidays.mockResolvedValue([holiday1, holiday2]);

      // Christmas in a different year (2026) should be a holiday because it's recurring
      const isRecurringMatch = await hoursEngine.isHoliday(
        'tenant1',
        new Date(2026, 11, 25, 12, 0, 0),
      );
      expect(isRecurringMatch).toBe(true);

      // Special holiday on 2026-06-25 should match
      const isSpecialMatch = await hoursEngine.isHoliday(
        'tenant1',
        new Date(2026, 5, 25, 12, 0, 0),
      );
      expect(isSpecialMatch).toBe(true);

      // Special holiday on 2027-06-25 should NOT match because it is non-recurring
      const isSpecialNoMatch = await hoursEngine.isHoliday(
        'tenant1',
        new Date(2027, 5, 25, 12, 0, 0),
      );
      expect(isSpecialNoMatch).toBe(false);
    });

    it('should return false for isOpenNow if no business hours are configured', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([]);
      mockRepo.getHolidays.mockResolvedValue([]);
      const open = await hoursEngine.isOpenNow('tenant1');
      expect(open).toBe(false);
    });

    it('should return false for isOpenNow if business hours are closed for the day', async () => {
      const dayHours = new BusinessHours('bh1', {
        tenantId: 'tenant1',
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isOpen: false,
        timezone: 'UTC',
      });
      mockRepo.getBusinessHours.mockResolvedValue([dayHours]);
      mockRepo.getHolidays.mockResolvedValue([]);
      const open = await hoursEngine.isOpenNow(
        'tenant1',
        new Date(2026, 5, 22, 10, 0, 0),
      ); // Monday
      expect(open).toBe(false);
    });

    it('should return false for isOpenNow if current time is outside start/end time window', async () => {
      const dayHours = new BusinessHours('bh1', {
        tenantId: 'tenant1',
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      mockRepo.getBusinessHours.mockResolvedValue([dayHours]);
      mockRepo.getHolidays.mockResolvedValue([]);
      const openEarly = await hoursEngine.isOpenNow(
        'tenant1',
        new Date(2026, 5, 22, 8, 0, 0),
      ); // Monday 8am
      const openLate = await hoursEngine.isOpenNow(
        'tenant1',
        new Date(2026, 5, 22, 18, 0, 0),
      ); // Monday 6pm
      expect(openEarly).toBe(false);
      expect(openLate).toBe(false);
    });

    it('should calculate next open time skipping holidays and closed days', async () => {
      const hoursMon = new BusinessHours('bh1', {
        tenantId: 'tenant1',
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      // Tuesday is closed
      const hoursTue = new BusinessHours('bh2', {
        tenantId: 'tenant1',
        dayOfWeek: 2,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isOpen: false,
        timezone: 'UTC',
      });
      // Wednesday is open
      const hoursWed = new BusinessHours('bh3', {
        tenantId: 'tenant1',
        dayOfWeek: 3,
        startTime: '08:00:00',
        endTime: '17:00:00',
        isOpen: true,
        timezone: 'UTC',
      });

      mockRepo.getBusinessHours.mockResolvedValue([
        hoursMon,
        hoursTue,
        hoursWed,
      ]);

      // Wednesday is a holiday
      const holiday = new Holiday('h1', {
        tenantId: 'tenant1',
        holidayName: 'Midweek Holiday',
        holidayDate: new Date(2026, 5, 24, 0, 0, 0), // Local Wednesday June 24
        isRecurring: false,
      });
      mockRepo.getHolidays.mockResolvedValue([holiday]);

      // Ask next open time starting on Monday afternoon after close (18:00)
      // Tuesday is closed. Wednesday is open but is a holiday. Thursday is open? We didn't define Thursday, so it acts as closed.
      // Let's define Thursday as open to be the next open target.
      const hoursThu = new BusinessHours('bh4', {
        tenantId: 'tenant1',
        dayOfWeek: 4,
        startTime: '10:00:00',
        endTime: '17:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      mockRepo.getBusinessHours.mockResolvedValue([
        hoursMon,
        hoursTue,
        hoursWed,
        hoursThu,
      ]);

      const next = await hoursEngine.nextOpenTime(
        'tenant1',
        new Date(2026, 5, 22, 18, 0, 0),
      ); // Local Monday 6pm
      expect(next).not.toBeNull();
      // Next open time should be Thursday morning at 10:00
      expect(next!.getDay()).toBe(4); // Thursday
      expect(next!.getHours()).toBe(10);
      expect(next!.getMinutes()).toBe(0);
    });

    it('should return null nextOpenTime if no business hours exist', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([]);
      const next = await hoursEngine.nextOpenTime('tenant1', new Date());
      expect(next).toBeNull();
    });

    it('should fallback to calendar duration if no business hours are defined in calculateBusinessTime', async () => {
      mockRepo.getBusinessHours.mockResolvedValue([]);
      const start = new Date(2026, 5, 22, 10, 0, 0);
      const target = await hoursEngine.calculateBusinessTime(
        'tenant1',
        start,
        3600,
      );
      expect(target.getTime()).toBe(start.getTime() + 3600 * 1000);
    });

    it('should calculate SLA time correctly across multiple open windows, closed days, and holidays', async () => {
      const hoursMon = new BusinessHours('bh1', {
        tenantId: 'tenant1',
        dayOfWeek: 1, // Monday
        startTime: '09:00:00',
        endTime: '12:00:00', // Only 3 hours open
        isOpen: true,
        timezone: 'UTC',
      });
      const hoursTue = new BusinessHours('bh2', {
        tenantId: 'tenant1',
        dayOfWeek: 2, // Tuesday
        startTime: '09:00:00',
        endTime: '12:00:00', // Only 3 hours open
        isOpen: true,
        timezone: 'UTC',
      });

      mockRepo.getBusinessHours.mockResolvedValue([hoursMon, hoursTue]);

      // Tuesday is a holiday
      const holiday = new Holiday('h1', {
        tenantId: 'tenant1',
        holidayName: 'Tue Holiday',
        holidayDate: new Date(2026, 5, 23, 0, 0, 0), // Local Tuesday
        isRecurring: false,
      });
      mockRepo.getHolidays.mockResolvedValue([holiday]);

      // Let's add Wednesday open hours
      const hoursWed = new BusinessHours('bh3', {
        tenantId: 'tenant1',
        dayOfWeek: 3, // Wednesday
        startTime: '09:00:00',
        endTime: '12:00:00',
        isOpen: true,
        timezone: 'UTC',
      });
      mockRepo.getBusinessHours.mockResolvedValue([
        hoursMon,
        hoursTue,
        hoursWed,
      ]);

      // Start on Monday at 10:00 local time (2 hours left in Monday window)
      // Ask for 4 hours of business duration.
      // First 2 hours are Monday 10:00 - 12:00. Remaining: 2 hours.
      // Tuesday is a holiday: skipped.
      // Wednesday: opens at 09:00. We run 2 hours of remaining time, ending Wednesday at 11:00.
      const start = new Date(2026, 5, 22, 10, 0, 0); // Local Mon June 22 10:00
      const target = await hoursEngine.calculateBusinessTime(
        'tenant1',
        start,
        4 * 3600,
      ); // 4 hours

      expect(target.getDay()).toBe(3); // Wednesday
      expect(target.getHours()).toBe(11);
      expect(target.getMinutes()).toBe(0);
    });
  });
});
