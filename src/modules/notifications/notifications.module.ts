import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule, QUEUES } from '@easydev/shared-queues';
import { NotificationService } from './notification.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { shouldRunProcessor } from '../../config/queue-role';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.NOTIFICATION }),
    QueueModule,
    forwardRef(() => SettingsModule),
  ],
  providers: [
    NotificationService,
    ...(shouldRunProcessor(QUEUES.NOTIFICATION)
      ? [NotificationQueueProcessor]
      : []),
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
