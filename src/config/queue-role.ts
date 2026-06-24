import { QueueName } from '@easydev/shared-queues';

// PROCESS_QUEUE is a comma-separated list of queue names this process should
// consume jobs from (e.g. "conversation-queue,message-queue,inbox-queue").
// Left unset - the api role - this process only ever produces jobs via
// QueueService and registers zero BullMQ consumers.
const activeQueues = new Set(
  (process.env.PROCESS_QUEUE || '')
    .split(',')
    .map((queue) => queue.trim())
    .filter(Boolean),
);

export function shouldRunProcessor(queueName: QueueName): boolean {
  return activeQueues.has(queueName);
}
