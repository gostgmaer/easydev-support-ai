import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';

// Controllers
import { TenantSettingsController } from './controllers/tenant-settings.controller';
import { BrandingController } from './controllers/branding.controller';
import { BusinessHoursController } from './controllers/business-hours.controller';
import { HolidayController } from './controllers/holiday.controller';
import { FeatureFlagController } from './controllers/feature-flag.controller';
import { AiSettingsController } from './controllers/ai-settings.controller';
import { ChannelSettingsController } from './controllers/channel-settings.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { SlaSettingsController } from './controllers/sla-settings.controller';
import { SecuritySettingsController } from './controllers/security-settings.controller';
import { WidgetSettingsController } from './controllers/widget-settings.controller';
import { UsageLimitController } from './controllers/usage-limit.controller';

// Services
import { TenantSettingsService } from './services/tenant-settings.service';
import { BrandingService } from './services/branding.service';
import { BusinessHoursService } from './services/business-hours.service';
import { HolidayService } from './services/holiday.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { AiSettingsService } from './services/ai-settings.service';
import { ChannelSettingsService } from './services/channel-settings.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { SlaSettingsService } from './services/sla-settings.service';
import { SecuritySettingsService } from './services/security-settings.service';
import { WidgetSettingsService } from './services/widget-settings.service';
import { UsageLimitService } from './services/usage-limit.service';
import { SettingsEventPublisher } from './services/settings-event.publisher';

// Engines
import { FeatureFlagEngine } from './engines/feature-flag.engine';
import { BusinessHoursEngine } from './engines/business-hours.engine';

// Repository
import { DrizzleSettingsRepository } from './repositories/drizzle-settings-repository';

// Jobs
import { SettingsQueueProcessor } from './jobs/settings-queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'settings-queue',
    }),
    NotificationsModule,
  ],
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
      useClass: DrizzleSettingsRepository,
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
  exports: [
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
    FeatureFlagEngine,
    BusinessHoursEngine,
    'ISettingsRepository',
  ],
})
export class SettingsModule {}
