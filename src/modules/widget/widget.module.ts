import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

// Controllers
import { WidgetConfigController } from './controllers/widget-config.controller';
import { WidgetSessionController } from './controllers/widget-session.controller';
import { WidgetVisitorController } from './controllers/widget-visitor.controller';
import { WidgetLeadController } from './controllers/widget-lead.controller';
import { WidgetInstallationController } from './controllers/widget-installation.controller';
import { WidgetEventController } from './controllers/widget-event.controller';
import { WidgetAuthController } from './controllers/widget-auth.controller';

// Services
import { WidgetConfigService } from './services/widget-config.service';
import { WidgetSessionService } from './services/widget-session.service';
import { WidgetVisitorService } from './services/widget-visitor.service';
import { WidgetLeadService } from './services/widget-lead.service';
import { WidgetIdentityService } from './services/widget-identity.service';
import { WidgetEventService } from './services/widget-event.service';
import { WidgetInstallationService } from './services/widget-installation.service';
import { WidgetRealtimeService } from './services/widget-realtime.service';
import { WidgetRealtimeGateway } from './services/widget-realtime.gateway';
import { WidgetEventPublisher } from './services/widget-event.publisher';

// Repository
import { DrizzleWidgetRepository } from './repositories/drizzle-widget-repository';

// Jobs
import { WidgetQueueProcessor } from './jobs/widget-queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'widget-queue',
    }),
  ],
  controllers: [
    WidgetConfigController,
    WidgetSessionController,
    WidgetVisitorController,
    WidgetLeadController,
    WidgetInstallationController,
    WidgetEventController,
    WidgetAuthController,
  ],
  providers: [
    {
      provide: 'IWidgetRepository',
      useClass: DrizzleWidgetRepository,
    },
    WidgetConfigService,
    WidgetSessionService,
    WidgetVisitorService,
    WidgetLeadService,
    WidgetIdentityService,
    WidgetEventService,
    WidgetInstallationService,
    WidgetRealtimeService,
    WidgetRealtimeGateway,
    WidgetEventPublisher,
    WidgetQueueProcessor,
  ],
  exports: [
    WidgetConfigService,
    WidgetSessionService,
    WidgetVisitorService,
    WidgetLeadService,
    WidgetIdentityService,
    WidgetEventService,
    WidgetInstallationService,
    WidgetRealtimeService,
    'IWidgetRepository',
  ],
})
export class WidgetModule {}
