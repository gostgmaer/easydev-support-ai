import type { JobsOptions } from 'bullmq';

/**
 * Canonical registry of every BullMQ queue used across the modular monolith.
 * The dead-letter queue is the terminal sink for jobs that exhaust their retries.
 */
export const QUEUES = {
  CONVERSATION: 'conversation-queue',
  MESSAGE: 'message-queue',
  TICKET: 'ticket-queue',
  KNOWLEDGE: 'knowledge-queue',
  CONNECTOR: 'connector-queue',
  WORKFLOW: 'workflow-queue',
  ANALYTICS: 'analytics-queue',
  NOTIFICATION: 'notification-queue',
  CUSTOMER: 'customer-queue',
  TEAM: 'team-queue',
  CHANNEL: 'channel-queue',
  SETTINGS: 'settings-queue',
  INBOX: 'inbox-queue',
  ADMIN: 'admin-queue',
  DEAD_LETTER: 'dead-letter-queue',
} as const;


export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const DEAD_LETTER_QUEUE: QueueName = QUEUES.DEAD_LETTER;

/**
 * Reusable retry policies. Producers pick a policy per job; the worker layer
 * routes any job that breaches its attempt budget into the dead-letter queue.
 */
export const RETRY_POLICIES = {
  DEFAULT: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
  CRITICAL: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  },
  NONE: {
    attempts: 1,
  },
} as const satisfies Record<string, JobsOptions>;

export type RetryPolicyName = keyof typeof RETRY_POLICIES;

/** Default job options applied to all standard queues. */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
  ...RETRY_POLICIES.DEFAULT,
};

/**
 * Dead-letter jobs must never auto-retry and must be retained for inspection
 * and manual replay.
 */
export const DEAD_LETTER_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: false,
  removeOnFail: false,
  ...RETRY_POLICIES.NONE,
};

/** Envelope persisted for every job routed to the dead-letter queue. */
export interface DeadLetterPayload<T = unknown> {
  sourceQueue: string;
  jobName: string;
  originalJobId: string | undefined;
  attemptsMade: number;
  failedReason: string;
  stack?: string;
  failedAt: string;
  tenantId?: string;
  data: T;
}
