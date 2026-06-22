import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

import { AnalyticsModule } from '../analytics/analytics.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { SettingsModule } from '../settings/settings.module';
import { CustomersModule } from '../customers/customers.module';
import { InboxModule } from '../inbox/inbox.module';

import {
  AdminDashboardController,
  AdminApiKeyController,
  AdminWebhookController,
  AdminHealthController,
  AdminIncidentController,
  AdminAuditController,
  AdminOverrideController,
  AdminTenantController,
} from './controllers';

import {
  AdminEventPublisher,
  AdminDashboardService,
  AdminWidgetService,
  AdminApiKeyService,
  AdminWebhookService,
  AdminIncidentService,
  AdminHealthService,
  AdminOverrideService,
  AdminAuditService,
  TenantProvisioningService,
} from './services';

import { DrizzleAdminRepository } from './repositories/drizzle-admin.repository';
import { AdminQueueProcessor, AdminHealthScheduler, AdminCleanupScheduler } from './jobs';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'admin-queue' }),
    AnalyticsModule,
    ConnectorsModule,
    WorkflowsModule,
    AiIntegrationModule,
    SettingsModule,
    CustomersModule,
    InboxModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminApiKeyController,
    AdminWebhookController,
    AdminHealthController,
    AdminIncidentController,
    AdminAuditController,
    AdminOverrideController,
    AdminTenantController,
  ],
  providers: [
    AdminEventPublisher,
    AdminDashboardService,
    AdminWidgetService,
    AdminApiKeyService,
    AdminWebhookService,
    AdminIncidentService,
    AdminHealthService,
    AdminOverrideService,
    AdminAuditService,
    TenantProvisioningService,
    AdminQueueProcessor,
    AdminHealthScheduler,
    AdminCleanupScheduler,
    {
      provide: 'IAdminRepository',
      useClass: DrizzleAdminRepository,
    },
  ],
  exports: [
    AdminDashboardService,
    AdminWidgetService,
    AdminApiKeyService,
    AdminWebhookService,
    AdminIncidentService,
    AdminHealthService,
    AdminOverrideService,
    AdminAuditService,
    TenantProvisioningService,
    'IAdminRepository',
  ],
})
export class AdminModule {}
