export const QUEUES = {
  CONVERSATION: 'conversation-queue',
  TICKET: 'ticket-queue',
  CONNECTOR: 'connector-queue',
  WORKFLOW: 'workflow-queue',
  ANALYTICS: 'analytics-queue',
  NOTIFICATION: 'notification-queue',
  CUSTOMER: 'customer-queue',
  TEAM: 'team-queue',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];
