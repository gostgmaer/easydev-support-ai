import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUES,
  DEFAULT_JOB_OPTIONS,
  DEAD_LETTER_JOB_OPTIONS,
} from './queue-definitions';
import { QueueService } from './queue.service';

const queues = Object.values(QUEUES).map((name) =>
  BullModule.registerQueue({
    name,
    defaultJobOptions:
      name === QUEUES.DEAD_LETTER
        ? DEAD_LETTER_JOB_OPTIONS
        : DEFAULT_JOB_OPTIONS,
  }),
);

@Global()
@Module({
  imports: [...queues],
  providers: [QueueService],
  exports: [...queues, QueueService],
})
export class QueueModule {}
