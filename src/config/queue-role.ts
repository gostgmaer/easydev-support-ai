// Re-exported from @easydev/shared-queues so packages outside src/ (e.g.
// the observability package's health checks) can use the same
// PROCESS_QUEUE-derived role logic without reaching into src/.
export { shouldRunProcessor } from '@easydev/shared-queues';
