import { QUEUES, QueueName } from './queue-definitions';

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

export function getActiveQueueNames(): QueueName[] {
  return Array.from(activeQueues) as QueueName[];
}

/** Every real, processor-backed queue - excludes DEAD_LETTER, which is a
 * terminal sink with no @Processor() by design. */
export function getProcessableQueueNames(): QueueName[] {
  return (Object.values(QUEUES) as QueueName[]).filter(
    (q) => q !== QUEUES.DEAD_LETTER,
  );
}
