import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule, QUEUES } from '@easydev/shared-queues';
import { NotificationService } from './notification.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { shouldRunProcessor } from '../../config/queue-role';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.NOTIFICATION }),
    QueueModule,
  ],
  providers: [
    NotificationService,
    ...(shouldRunProcessor(QUEUES.NOTIFICATION) ? [NotificationQueueProcessor] : []),
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
