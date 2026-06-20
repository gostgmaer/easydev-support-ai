import { pgSchema, uuid, timestamp, varchar, text, integer, boolean, jsonb, numeric, doublePrecision, index, uniqueIndex } from 'drizzle-orm/pg-core';

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

// 4. Customers Table
export const customers = supportAgentSchema.table('customers', {
  ...commonColumns,
  externalCustomerId: varchar('external_customer_id', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE, MERGED
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  lastSeenAt: timestamp('last_seen_at'),
  source: varchar('source', { length: 50 }).default('API').notNull(), // WIDGET, API, IMPORT, MANUAL
  metadata: jsonb('metadata'),
}, (table) => {
  return {
    tenantIdIdx: index('idx_customers_tenant').on(table.tenantId),
    tenantEmailUnique: uniqueIndex('uq_customers_tenant_email').on(table.tenantId, table.email),
    tenantExtIdUnique: uniqueIndex('uq_customers_tenant_ext_id').on(table.tenantId, table.externalCustomerId),
    searchIdx: index('idx_customers_search').on(table.tenantId, table.status, table.email),
  };
});

// 5. Customer Profiles Table
export const customerProfiles = supportAgentSchema.table('customer_profiles', {
  ...commonColumns,
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  displayName: varchar('display_name', { length: 200 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  tags: jsonb('tags'), // JSON array of strings
  customAttributes: jsonb('custom_attributes'),
}, (table) => {
  return {
    tenantIdIdx: index('idx_customer_profiles_tenant').on(table.tenantId),
    customerIdIdx: index('idx_customer_profiles_customer').on(table.customerId),
    searchIdx: index('idx_customer_profiles_search').on(table.tenantId, table.firstName, table.lastName, table.displayName),
  };
});

// 6. Customer Segments Table
export const customerSegments = supportAgentSchema.table('customer_segments', {
  ...commonColumns,
  segmentName: varchar('segment_name', { length: 255 }).notNull(),
  segmentType: varchar('segment_type', { length: 50 }).notNull(), // STATIC, DYNAMIC
  rules: jsonb('rules'), // Rules JSON query definition
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => {
  return {
    tenantIdIdx: index('idx_customer_segments_tenant').on(table.tenantId),
    tenantNameUnique: uniqueIndex('uq_customer_segments_tenant_name').on(table.tenantId, table.segmentName),
  };
});

// 7. Customer Segment Members (Join Table)
export const customerSegmentMembers = supportAgentSchema.table('customer_segment_members', {
  ...commonColumns,
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  segmentId: uuid('segment_id').references(() => customerSegments.id, { onDelete: 'cascade' }).notNull(),
}, (table) => {
  return {
    tenantIdIdx: index('idx_customer_segment_members_tenant').on(table.tenantId),
    memberUnique: uniqueIndex('uq_customer_segment_members').on(table.tenantId, table.customerId, table.segmentId),
  };
});

// 8. Customer Metrics Table
export const customerMetrics = supportAgentSchema.table('customer_metrics', {
  ...commonColumns,
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  totalConversations: integer('total_conversations').default(0).notNull(),
  totalTickets: integer('total_tickets').default(0).notNull(),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpend: numeric('total_spend', { precision: 12, scale: 2 }).default('0.00').notNull(),
  averageCsat: doublePrecision('average_csat').default(0.0).notNull(),
  averageResponseTime: integer('average_response_time').default(0).notNull(), // seconds
  averageResolutionTime: integer('average_resolution_time').default(0).notNull(), // seconds
  sentimentScore: doublePrecision('sentiment_score').default(0.0).notNull(), // -1.0 to 1.0
  lifetimeValue: numeric('lifetime_value', { precision: 12, scale: 2 }).default('0.00').notNull(),
  riskScore: doublePrecision('risk_score').default(0.0).notNull(), // 0.0 to 100.0
  vipStatus: boolean('vip_status').default(false).notNull(),
}, (table) => {
  return {
    tenantIdIdx: index('idx_customer_metrics_tenant').on(table.tenantId),
    customerIdUnique: uniqueIndex('uq_customer_metrics_customer').on(table.tenantId, table.customerId),
  };
});
