"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelRateLimits = exports.channelTemplates = exports.channelWebhooks = exports.channelConfigurations = exports.channels = exports.agentAvailability = exports.assignmentRules = exports.teamMembers = exports.agentProfiles = exports.teams = exports.customerMetrics = exports.customerSegmentMembers = exports.customerSegments = exports.customerProfiles = exports.customers = exports.tenantLimits = exports.tenantUsage = exports.auditLogs = exports.supportAgentSchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Create postgres schema
exports.supportAgentSchema = (0, pg_core_1.pgSchema)('ai_support_agent');
// Helper for common audit columns
const commonColumns = {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by'),
    updatedBy: (0, pg_core_1.uuid)('updated_by'),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at'),
    version: (0, pg_core_1.integer)('version').default(1).notNull(),
};
// 1. Audit Logs Table
exports.auditLogs = exports.supportAgentSchema.table('audit_logs', {
    ...commonColumns,
    userId: (0, pg_core_1.uuid)('user_id'),
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, ASSIGN, TRANSFER, LOGIN, WORKFLOW, CONNECTOR
    details: (0, pg_core_1.text)('details'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.varchar)('user_agent', { length: 255 }),
});
// 2. Tenant Usage Table
exports.tenantUsage = exports.supportAgentSchema.table('tenant_usage', {
    ...commonColumns,
    metric: (0, pg_core_1.varchar)('metric', { length: 100 }).notNull(), // CONVERSATIONS_COUNT, AGENTS_COUNT, etc.
    value: (0, pg_core_1.integer)('value').default(0).notNull(),
    resetAt: (0, pg_core_1.timestamp)('reset_at').notNull(),
});
// 3. Tenant Limits Table
exports.tenantLimits = exports.supportAgentSchema.table('tenant_limits', {
    ...commonColumns,
    feature: (0, pg_core_1.varchar)('feature', { length: 100 }).notNull(), // CONVERSATIONS_LIMIT, AGENTS_LIMIT, etc.
    maxValue: (0, pg_core_1.integer)('max_value').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
});
// 4. Customers Table
exports.customers = exports.supportAgentSchema.table('customers', {
    ...commonColumns,
    externalCustomerId: (0, pg_core_1.varchar)('external_customer_id', { length: 255 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE, MERGED
    preferredLanguage: (0, pg_core_1.varchar)('preferred_language', { length: 10 }).default('en').notNull(),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 50 }).default('UTC').notNull(),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at'),
    source: (0, pg_core_1.varchar)('source', { length: 50 }).default('API').notNull(), // WIDGET, API, IMPORT, MANUAL
    metadata: (0, pg_core_1.jsonb)('metadata'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_customers_tenant').on(table.tenantId),
        tenantEmailUnique: (0, pg_core_1.uniqueIndex)('uq_customers_tenant_email').on(table.tenantId, table.email),
        tenantExtIdUnique: (0, pg_core_1.uniqueIndex)('uq_customers_tenant_ext_id').on(table.tenantId, table.externalCustomerId),
        searchIdx: (0, pg_core_1.index)('idx_customers_search').on(table.tenantId, table.status, table.email),
    };
});
// 5. Customer Profiles Table
exports.customerProfiles = exports.supportAgentSchema.table('customer_profiles', {
    ...commonColumns,
    customerId: (0, pg_core_1.uuid)('customer_id').references(() => exports.customers.id, { onDelete: 'cascade' }).notNull(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 200 }),
    avatarUrl: (0, pg_core_1.varchar)('avatar_url', { length: 500 }),
    company: (0, pg_core_1.varchar)('company', { length: 255 }),
    jobTitle: (0, pg_core_1.varchar)('job_title', { length: 255 }),
    country: (0, pg_core_1.varchar)('country', { length: 100 }),
    city: (0, pg_core_1.varchar)('city', { length: 100 }),
    state: (0, pg_core_1.varchar)('state', { length: 100 }),
    postalCode: (0, pg_core_1.varchar)('postal_code', { length: 20 }),
    tags: (0, pg_core_1.jsonb)('tags'), // JSON array of strings
    customAttributes: (0, pg_core_1.jsonb)('custom_attributes'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_customer_profiles_tenant').on(table.tenantId),
        customerIdIdx: (0, pg_core_1.index)('idx_customer_profiles_customer').on(table.customerId),
        searchIdx: (0, pg_core_1.index)('idx_customer_profiles_search').on(table.tenantId, table.firstName, table.lastName, table.displayName),
    };
});
// 6. Customer Segments Table
exports.customerSegments = exports.supportAgentSchema.table('customer_segments', {
    ...commonColumns,
    segmentName: (0, pg_core_1.varchar)('segment_name', { length: 255 }).notNull(),
    segmentType: (0, pg_core_1.varchar)('segment_type', { length: 50 }).notNull(), // STATIC, DYNAMIC
    rules: (0, pg_core_1.jsonb)('rules'), // Rules JSON query definition
    description: (0, pg_core_1.text)('description'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_customer_segments_tenant').on(table.tenantId),
        tenantNameUnique: (0, pg_core_1.uniqueIndex)('uq_customer_segments_tenant_name').on(table.tenantId, table.segmentName),
    };
});
// 7. Customer Segment Members (Join Table)
exports.customerSegmentMembers = exports.supportAgentSchema.table('customer_segment_members', {
    ...commonColumns,
    customerId: (0, pg_core_1.uuid)('customer_id').references(() => exports.customers.id, { onDelete: 'cascade' }).notNull(),
    segmentId: (0, pg_core_1.uuid)('segment_id').references(() => exports.customerSegments.id, { onDelete: 'cascade' }).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_customer_segment_members_tenant').on(table.tenantId),
        memberUnique: (0, pg_core_1.uniqueIndex)('uq_customer_segment_members').on(table.tenantId, table.customerId, table.segmentId),
    };
});
// 8. Customer Metrics Table
exports.customerMetrics = exports.supportAgentSchema.table('customer_metrics', {
    ...commonColumns,
    customerId: (0, pg_core_1.uuid)('customer_id').references(() => exports.customers.id, { onDelete: 'cascade' }).notNull(),
    totalConversations: (0, pg_core_1.integer)('total_conversations').default(0).notNull(),
    totalTickets: (0, pg_core_1.integer)('total_tickets').default(0).notNull(),
    totalOrders: (0, pg_core_1.integer)('total_orders').default(0).notNull(),
    totalSpend: (0, pg_core_1.numeric)('total_spend', { precision: 12, scale: 2 }).default('0.00').notNull(),
    averageCsat: (0, pg_core_1.doublePrecision)('average_csat').default(0.0).notNull(),
    averageResponseTime: (0, pg_core_1.integer)('average_response_time').default(0).notNull(), // seconds
    averageResolutionTime: (0, pg_core_1.integer)('average_resolution_time').default(0).notNull(), // seconds
    sentimentScore: (0, pg_core_1.doublePrecision)('sentiment_score').default(0.0).notNull(), // -1.0 to 1.0
    lifetimeValue: (0, pg_core_1.numeric)('lifetime_value', { precision: 12, scale: 2 }).default('0.00').notNull(),
    riskScore: (0, pg_core_1.doublePrecision)('risk_score').default(0.0).notNull(), // 0.0 to 100.0
    vipStatus: (0, pg_core_1.boolean)('vip_status').default(false).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_customer_metrics_tenant').on(table.tenantId),
        customerIdUnique: (0, pg_core_1.uniqueIndex)('uq_customer_metrics_customer').on(table.tenantId, table.customerId),
    };
});
// 9. Teams Table
exports.teams = exports.supportAgentSchema.table('teams', {
    ...commonColumns,
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    department: (0, pg_core_1.varchar)('department', { length: 100 }),
    priority: (0, pg_core_1.integer)('priority').default(1).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_teams_tenant').on(table.tenantId),
        tenantNameUnique: (0, pg_core_1.uniqueIndex)('uq_teams_tenant_name').on(table.tenantId, table.name),
    };
});
// 10. Agent Profiles Table
exports.agentProfiles = exports.supportAgentSchema.table('agent_profiles', {
    ...commonColumns,
    userId: (0, pg_core_1.uuid)('user_id').notNull(),
    employeeCode: (0, pg_core_1.varchar)('employee_code', { length: 100 }),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 200 }).notNull(),
    avatarUrl: (0, pg_core_1.varchar)('avatar_url', { length: 500 }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE
    capacity: (0, pg_core_1.integer)('capacity').default(10).notNull(),
    maxConcurrentConversations: (0, pg_core_1.integer)('max_concurrent_conversations').default(5).notNull(),
    maxOpenTickets: (0, pg_core_1.integer)('max_open_tickets').default(20).notNull(),
    skillScore: (0, pg_core_1.doublePrecision)('skill_score').default(0.0).notNull(),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 50 }).default('UTC').notNull(),
    languagePreferences: (0, pg_core_1.jsonb)('language_preferences'), // Array of language strings: ['en', 'es']
    metadata: (0, pg_core_1.jsonb)('metadata'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_agent_profiles_tenant').on(table.tenantId),
        tenantUserIdUnique: (0, pg_core_1.uniqueIndex)('uq_agent_profiles_tenant_user').on(table.tenantId, table.userId),
        tenantEmpCodeUnique: (0, pg_core_1.uniqueIndex)('uq_agent_profiles_tenant_emp_code').on(table.tenantId, table.employeeCode),
    };
});
// 11. Team Members Table (Join Table)
exports.teamMembers = exports.supportAgentSchema.table('team_members', {
    ...commonColumns,
    teamId: (0, pg_core_1.uuid)('team_id').references(() => exports.teams.id, { onDelete: 'cascade' }).notNull(),
    agentProfileId: (0, pg_core_1.uuid)('agent_profile_id').references(() => exports.agentProfiles.id, { onDelete: 'cascade' }).notNull(),
    role: (0, pg_core_1.varchar)('role', { length: 50 }).default('MEMBER').notNull(), // LEADER, MEMBER
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
    isPrimary: (0, pg_core_1.boolean)('is_primary').default(false).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_team_members_tenant').on(table.tenantId),
        teamMemberUnique: (0, pg_core_1.uniqueIndex)('uq_team_members').on(table.tenantId, table.teamId, table.agentProfileId),
    };
});
// 12. Assignment Rules Table
exports.assignmentRules = exports.supportAgentSchema.table('assignment_rules', {
    ...commonColumns,
    teamId: (0, pg_core_1.uuid)('team_id').references(() => exports.teams.id, { onDelete: 'cascade' }).notNull(),
    ruleType: (0, pg_core_1.varchar)('rule_type', { length: 50 }).notNull(), // ROUND_ROBIN, LEAST_LOADED, SKILL_BASED, PRIORITY_BASED, MANUAL
    priority: (0, pg_core_1.integer)('priority').default(1).notNull(),
    configuration: (0, pg_core_1.jsonb)('configuration'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_assignment_rules_tenant').on(table.tenantId),
        teamRuleTypeUnique: (0, pg_core_1.uniqueIndex)('uq_team_rule_type').on(table.tenantId, table.teamId, table.ruleType),
    };
});
// 13. Agent Availability Table
exports.agentAvailability = exports.supportAgentSchema.table('agent_availability', {
    ...commonColumns,
    agentProfileId: (0, pg_core_1.uuid)('agent_profile_id').references(() => exports.agentProfiles.id, { onDelete: 'cascade' }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('OFFLINE').notNull(), // ONLINE, OFFLINE, AWAY
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at').defaultNow().notNull(),
    workingHours: (0, pg_core_1.jsonb)('working_hours'), // { timezone: 'UTC', slots: [{ start: '09:00', end: '17:00' }] }
    currentLoad: (0, pg_core_1.integer)('current_load').default(0).notNull(),
    activeConversations: (0, pg_core_1.integer)('active_conversations').default(0).notNull(),
    activeTickets: (0, pg_core_1.integer)('active_tickets').default(0).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_agent_availability_tenant').on(table.tenantId),
        agentProfileUnique: (0, pg_core_1.uniqueIndex)('uq_agent_availability_profile').on(table.tenantId, table.agentProfileId),
    };
});
// 14. Channels Table
exports.channels = exports.supportAgentSchema.table('channels', {
    ...commonColumns,
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // WHATSAPP, EMAIL, WEBCHAT, TELEGRAM, FACEBOOK, INSTAGRAM, SLACK, TEAMS, VOICE
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(),
    provider: (0, pg_core_1.varchar)('provider', { length: 100 }).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false).notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_channels_tenant').on(table.tenantId),
        typeIdx: (0, pg_core_1.index)('idx_channels_type').on(table.tenantId, table.type),
        uniqueName: (0, pg_core_1.uniqueIndex)('uq_channels_tenant_name').on(table.tenantId, table.name),
    };
});
// 15. Channel Configurations Table
exports.channelConfigurations = exports.supportAgentSchema.table('channel_configurations', {
    ...commonColumns,
    channelId: (0, pg_core_1.uuid)('channel_id').references(() => exports.channels.id, { onDelete: 'cascade' }).notNull(),
    authenticationType: (0, pg_core_1.varchar)('authentication_type', { length: 50 }).notNull(), // API_KEY, OAUTH2, BASIC
    configuration: (0, pg_core_1.jsonb)('configuration').notNull(),
    credentials: (0, pg_core_1.jsonb)('credentials').notNull(),
    settings: (0, pg_core_1.jsonb)('settings'),
    healthStatus: (0, pg_core_1.varchar)('health_status', { length: 50 }).default('UNKNOWN').notNull(),
    lastHealthCheck: (0, pg_core_1.timestamp)('last_health_check'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_channel_config_tenant').on(table.tenantId),
        channelUnique: (0, pg_core_1.uniqueIndex)('uq_channel_config_channel').on(table.tenantId, table.channelId),
    };
});
// 16. Channel Webhooks Table
exports.channelWebhooks = exports.supportAgentSchema.table('channel_webhooks', {
    ...commonColumns,
    channelId: (0, pg_core_1.uuid)('channel_id').references(() => exports.channels.id, { onDelete: 'cascade' }).notNull(),
    webhookUrl: (0, pg_core_1.varchar)('webhook_url', { length: 500 }).notNull(),
    webhookSecret: (0, pg_core_1.varchar)('webhook_secret', { length: 255 }),
    verificationToken: (0, pg_core_1.varchar)('verification_token', { length: 255 }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('ACTIVE').notNull(),
    lastReceivedAt: (0, pg_core_1.timestamp)('last_received_at'),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_channel_webhooks_tenant').on(table.tenantId),
        channelUnique: (0, pg_core_1.uniqueIndex)('uq_channel_webhooks_channel').on(table.tenantId, table.channelId),
    };
});
// 17. Channel Templates Table
exports.channelTemplates = exports.supportAgentSchema.table('channel_templates', {
    ...commonColumns,
    channelId: (0, pg_core_1.uuid)('channel_id').references(() => exports.channels.id, { onDelete: 'cascade' }).notNull(),
    templateName: (0, pg_core_1.varchar)('template_name', { length: 255 }).notNull(),
    templateType: (0, pg_core_1.varchar)('template_type', { length: 50 }).notNull(), // TEXT, IMAGE, BUTTONS
    templateContent: (0, pg_core_1.text)('template_content').notNull(),
    variables: (0, pg_core_1.jsonb)('variables'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_channel_templates_tenant').on(table.tenantId),
        uniqueTemplate: (0, pg_core_1.uniqueIndex)('uq_channel_templates_name').on(table.tenantId, table.channelId, table.templateName),
    };
});
// 18. Channel Rate Limits Table
exports.channelRateLimits = exports.supportAgentSchema.table('channel_rate_limits', {
    ...commonColumns,
    channelId: (0, pg_core_1.uuid)('channel_id').references(() => exports.channels.id, { onDelete: 'cascade' }).notNull(),
    providerLimit: (0, pg_core_1.integer)('provider_limit').default(100).notNull(),
    tenantLimit: (0, pg_core_1.integer)('tenant_limit').default(50).notNull(),
    currentUsage: (0, pg_core_1.integer)('current_usage').default(0).notNull(),
    resetAt: (0, pg_core_1.timestamp)('reset_at').notNull(),
}, (table) => {
    return {
        tenantIdIdx: (0, pg_core_1.index)('idx_channel_rate_limits_tenant').on(table.tenantId),
        channelUnique: (0, pg_core_1.uniqueIndex)('uq_channel_rate_limits_channel').on(table.tenantId, table.channelId),
    };
});
