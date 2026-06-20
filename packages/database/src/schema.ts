import { pgSchema, uuid, timestamp, varchar, text, integer, boolean } from 'drizzle-orm/pg-core';

// Create postgres schema
export const supportAgentSchema = pgSchema('ai_support_agent');

// Helper for common audit columns
const commonColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at'),
  version: integer('version').default(1).notNull(),
};

// 1. Audit Logs Table
export const auditLogs = supportAgentSchema.table('audit_logs', {
  ...commonColumns,
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, ASSIGN, TRANSFER, LOGIN, WORKFLOW, CONNECTOR
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
});

// 2. Tenant Usage Table
export const tenantUsage = supportAgentSchema.table('tenant_usage', {
  ...commonColumns,
  metric: varchar('metric', { length: 100 }).notNull(), // CONVERSATIONS_COUNT, AGENTS_COUNT, etc.
  value: integer('value').default(0).notNull(),
  resetAt: timestamp('reset_at').notNull(),
});

// 3. Tenant Limits Table
export const tenantLimits = supportAgentSchema.table('tenant_limits', {
  ...commonColumns,
  feature: varchar('feature', { length: 100 }).notNull(), // CONVERSATIONS_LIMIT, AGENTS_LIMIT, etc.
  maxValue: integer('max_value').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});
