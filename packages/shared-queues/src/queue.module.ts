import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue-definitions';
import { QueueService } from './queue.service';

const queues = Object.values(QUEUES).map((name) =>
  BullModule.registerQueue({
    name,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  })
);

@Global()
@Module({
  imports: [
    ...queues,
  ],
  providers: [QueueService],
  exports: [
    ...queues,
    QueueService,
  ],
})
export class QueueModule {}
