import {
  pgSchema,
  uuid,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  numeric,
  doublePrecision,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

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
export const customers = supportAgentSchema.table(
  'customers',
  {
    ...commonColumns,
    externalCustomerId: varchar('external_customer_id', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE, MERGED
    preferredLanguage: varchar('preferred_language', { length: 10 })
      .default('en')
      .notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    lastSeenAt: timestamp('last_seen_at'),
    source: varchar('source', { length: 50 }).default('API').notNull(), // WIDGET, API, IMPORT, MANUAL
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_customers_tenant').on(table.tenantId),
      tenantEmailUnique: uniqueIndex('uq_customers_tenant_email').on(
        table.tenantId,
        table.email,
      ),
      tenantExtIdUnique: uniqueIndex('uq_customers_tenant_ext_id').on(
        table.tenantId,
        table.externalCustomerId,
      ),
      searchIdx: index('idx_customers_search').on(
        table.tenantId,
        table.status,
        table.email,
      ),
    };
  },
);

// 5. Customer Profiles Table
export const customerProfiles = supportAgentSchema.table(
  'customer_profiles',
  {
    ...commonColumns,
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
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
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_customer_profiles_tenant').on(table.tenantId),
      customerIdIdx: index('idx_customer_profiles_customer').on(
        table.customerId,
      ),
      searchIdx: index('idx_customer_profiles_search').on(
        table.tenantId,
        table.firstName,
        table.lastName,
        table.displayName,
      ),
    };
  },
);

// 6. Customer Segments Table
export const customerSegments = supportAgentSchema.table(
  'customer_segments',
  {
    ...commonColumns,
    segmentName: varchar('segment_name', { length: 255 }).notNull(),
    segmentType: varchar('segment_type', { length: 50 }).notNull(), // STATIC, DYNAMIC
    rules: jsonb('rules'), // Rules JSON query definition
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_customer_segments_tenant').on(table.tenantId),
      tenantNameUnique: uniqueIndex('uq_customer_segments_tenant_name').on(
        table.tenantId,
        table.segmentName,
      ),
    };
  },
);

// 7. Customer Segment Members (Join Table)
export const customerSegmentMembers = supportAgentSchema.table(
  'customer_segment_members',
  {
    ...commonColumns,
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    segmentId: uuid('segment_id')
      .references(() => customerSegments.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_customer_segment_members_tenant').on(
        table.tenantId,
      ),
      memberUnique: uniqueIndex('uq_customer_segment_members').on(
        table.tenantId,
        table.customerId,
        table.segmentId,
      ),
    };
  },
);

// 8. Customer Metrics Table
export const customerMetrics = supportAgentSchema.table(
  'customer_metrics',
  {
    ...commonColumns,
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    totalConversations: integer('total_conversations').default(0).notNull(),
    totalTickets: integer('total_tickets').default(0).notNull(),
    totalOrders: integer('total_orders').default(0).notNull(),
    totalSpend: numeric('total_spend', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    averageCsat: doublePrecision('average_csat').default(0.0).notNull(),
    averageResponseTime: integer('average_response_time').default(0).notNull(), // seconds
    averageResolutionTime: integer('average_resolution_time')
      .default(0)
      .notNull(), // seconds
    sentimentScore: doublePrecision('sentiment_score').default(0.0).notNull(), // -1.0 to 1.0
    lifetimeValue: numeric('lifetime_value', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    riskScore: doublePrecision('risk_score').default(0.0).notNull(), // 0.0 to 100.0
    vipStatus: boolean('vip_status').default(false).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_customer_metrics_tenant').on(table.tenantId),
      customerIdUnique: uniqueIndex('uq_customer_metrics_customer').on(
        table.tenantId,
        table.customerId,
      ),
    };
  },
);

// 9. Teams Table
export const teams = supportAgentSchema.table(
  'teams',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    department: varchar('department', { length: 100 }),
    priority: integer('priority').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_teams_tenant').on(table.tenantId),
      tenantNameUnique: uniqueIndex('uq_teams_tenant_name').on(
        table.tenantId,
        table.name,
      ),
    };
  },
);

// 10. Agent Profiles Table
export const agentProfiles = supportAgentSchema.table(
  'agent_profiles',
  {
    ...commonColumns,
    userId: uuid('user_id').notNull(),
    employeeCode: varchar('employee_code', { length: 100 }),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE
    capacity: integer('capacity').default(10).notNull(),
    maxConcurrentConversations: integer('max_concurrent_conversations')
      .default(5)
      .notNull(),
    maxOpenTickets: integer('max_open_tickets').default(20).notNull(),
    skillScore: doublePrecision('skill_score').default(0.0).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    languagePreferences: jsonb('language_preferences'), // Array of language strings: ['en', 'es']
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_agent_profiles_tenant').on(table.tenantId),
      tenantUserIdUnique: uniqueIndex('uq_agent_profiles_tenant_user').on(
        table.tenantId,
        table.userId,
      ),
      tenantEmpCodeUnique: uniqueIndex('uq_agent_profiles_tenant_emp_code').on(
        table.tenantId,
        table.employeeCode,
      ),
    };
  },
);

// 11. Team Members Table (Join Table)
export const teamMembers = supportAgentSchema.table(
  'team_members',
  {
    ...commonColumns,
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    agentProfileId: uuid('agent_profile_id')
      .references(() => agentProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 50 }).default('MEMBER').notNull(), // LEADER, MEMBER
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_team_members_tenant').on(table.tenantId),
      teamMemberUnique: uniqueIndex('uq_team_members').on(
        table.tenantId,
        table.teamId,
        table.agentProfileId,
      ),
    };
  },
);

// 12. Assignment Rules Table
export const assignmentRules = supportAgentSchema.table(
  'assignment_rules',
  {
    ...commonColumns,
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    ruleType: varchar('rule_type', { length: 50 }).notNull(), // ROUND_ROBIN, LEAST_LOADED, SKILL_BASED, PRIORITY_BASED, MANUAL
    priority: integer('priority').default(1).notNull(),
    configuration: jsonb('configuration'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_assignment_rules_tenant').on(table.tenantId),
      teamRuleTypeUnique: uniqueIndex('uq_team_rule_type').on(
        table.tenantId,
        table.teamId,
        table.ruleType,
      ),
    };
  },
);

// 13. Agent Availability Table
export const agentAvailability = supportAgentSchema.table(
  'agent_availability',
  {
    ...commonColumns,
    agentProfileId: uuid('agent_profile_id')
      .references(() => agentProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 50 }).default('OFFLINE').notNull(), // ONLINE, OFFLINE, AWAY
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    workingHours: jsonb('working_hours'), // { timezone: 'UTC', slots: [{ start: '09:00', end: '17:00' }] }
    currentLoad: integer('current_load').default(0).notNull(),
    activeConversations: integer('active_conversations').default(0).notNull(),
    activeTickets: integer('active_tickets').default(0).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_agent_availability_tenant').on(table.tenantId),
      agentProfileUnique: uniqueIndex('uq_agent_availability_profile').on(
        table.tenantId,
        table.agentProfileId,
      ),
    };
  },
);

// 14. Channels Table
export const channels = supportAgentSchema.table(
  'channels',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // WHATSAPP, EMAIL, WEBCHAT, TELEGRAM, FACEBOOK, INSTAGRAM, SLACK, TEAMS, VOICE
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    provider: varchar('provider', { length: 100 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_channels_tenant').on(table.tenantId),
      typeIdx: index('idx_channels_type').on(table.tenantId, table.type),
      uniqueName: uniqueIndex('uq_channels_tenant_name').on(
        table.tenantId,
        table.name,
      ),
    };
  },
);

// 15. Channel Configurations Table
export const channelConfigurations = supportAgentSchema.table(
  'channel_configurations',
  {
    ...commonColumns,
    channelId: uuid('channel_id')
      .references(() => channels.id, { onDelete: 'cascade' })
      .notNull(),
    authenticationType: varchar('authentication_type', {
      length: 50,
    }).notNull(), // API_KEY, OAUTH2, BASIC
    configuration: jsonb('configuration').notNull(),
    credentials: jsonb('credentials').notNull(),
    settings: jsonb('settings'),
    healthStatus: varchar('health_status', { length: 50 })
      .default('UNKNOWN')
      .notNull(),
    lastHealthCheck: timestamp('last_health_check'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_channel_config_tenant').on(table.tenantId),
      channelUnique: uniqueIndex('uq_channel_config_channel').on(
        table.tenantId,
        table.channelId,
      ),
    };
  },
);

// 16. Channel Webhooks Table
export const channelWebhooks = supportAgentSchema.table(
  'channel_webhooks',
  {
    ...commonColumns,
    channelId: uuid('channel_id')
      .references(() => channels.id, { onDelete: 'cascade' })
      .notNull(),
    webhookUrl: varchar('webhook_url', { length: 500 }).notNull(),
    webhookSecret: varchar('webhook_secret', { length: 255 }),
    verificationToken: varchar('verification_token', { length: 255 }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    lastReceivedAt: timestamp('last_received_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_channel_webhooks_tenant').on(table.tenantId),
      channelUnique: uniqueIndex('uq_channel_webhooks_channel').on(
        table.tenantId,
        table.channelId,
      ),
    };
  },
);

// 17. Channel Templates Table
export const channelTemplates = supportAgentSchema.table(
  'channel_templates',
  {
    ...commonColumns,
    channelId: uuid('channel_id')
      .references(() => channels.id, { onDelete: 'cascade' })
      .notNull(),
    templateName: varchar('template_name', { length: 255 }).notNull(),
    templateType: varchar('template_type', { length: 50 }).notNull(), // TEXT, IMAGE, BUTTONS
    templateContent: text('template_content').notNull(),
    variables: jsonb('variables'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_channel_templates_tenant').on(table.tenantId),
      uniqueTemplate: uniqueIndex('uq_channel_templates_name').on(
        table.tenantId,
        table.channelId,
        table.templateName,
      ),
    };
  },
);

// 18. Channel Rate Limits Table
export const channelRateLimits = supportAgentSchema.table(
  'channel_rate_limits',
  {
    ...commonColumns,
    channelId: uuid('channel_id')
      .references(() => channels.id, { onDelete: 'cascade' })
      .notNull(),
    providerLimit: integer('provider_limit').default(100).notNull(),
    tenantLimit: integer('tenant_limit').default(50).notNull(),
    currentUsage: integer('current_usage').default(0).notNull(),
    resetAt: timestamp('reset_at').notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_channel_rate_limits_tenant').on(table.tenantId),
      channelUnique: uniqueIndex('uq_channel_rate_limits_channel').on(
        table.tenantId,
        table.channelId,
      ),
    };
  },
);

// 19. Conversations Table
export const conversations = supportAgentSchema.table(
  'conversations',
  {
    ...commonColumns,
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    channelId: uuid('channel_id').references(() => channels.id, {
      onDelete: 'set null',
    }),
    assignedAgentId: uuid('assigned_agent_id').references(
      () => agentProfiles.id,
      { onDelete: 'set null' },
    ),
    assignedTeamId: uuid('assigned_team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 50 }).default('OPEN').notNull(), // OPEN, PENDING, ASSIGNED, WAITING_CUSTOMER, WAITING_AGENT, RESOLVED, CLOSED, ARCHIVED
    priority: varchar('priority', { length: 50 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, URGENT, CRITICAL
    subject: varchar('subject', { length: 500 }),
    language: varchar('language', { length: 10 }).default('en').notNull(),
    sentiment: varchar('sentiment', { length: 20 })
      .default('NEUTRAL')
      .notNull(), // POSITIVE, NEUTRAL, NEGATIVE
    source: varchar('source', { length: 50 }).default('API').notNull(),
    lastMessageAt: timestamp('last_message_at'),
    lastActivityAt: timestamp('last_activity_at'),
    firstResponseAt: timestamp('first_response_at'),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversations_tenant').on(table.tenantId),
      inboxIdx: index('idx_conversations_inbox').on(
        table.tenantId,
        table.status,
        table.priority,
        table.lastMessageAt,
      ),
      agentIdx: index('idx_conversations_agent').on(
        table.tenantId,
        table.assignedAgentId,
        table.status,
      ),
      teamIdx: index('idx_conversations_team').on(
        table.tenantId,
        table.assignedTeamId,
        table.status,
      ),
      customerIdx: index('idx_conversations_customer').on(
        table.tenantId,
        table.customerId,
      ),
      activityIdx: index('idx_conversations_activity').on(
        table.tenantId,
        table.lastActivityAt,
      ),
    };
  },
);

// 20. Conversation Summary Table (inbox-optimized read model)
export const conversationSummary = supportAgentSchema.table(
  'conversation_summary',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    customerName: varchar('customer_name', { length: 255 }),
    customerAvatar: varchar('customer_avatar', { length: 500 }),
    lastMessage: text('last_message'),
    lastMessageType: varchar('last_message_type', { length: 50 }),
    lastMessageAt: timestamp('last_message_at'),
    unreadCount: integer('unread_count').default(0).notNull(),
    totalMessages: integer('total_messages').default(0).notNull(),
    totalAttachments: integer('total_attachments').default(0).notNull(),
    sentimentScore: doublePrecision('sentiment_score').default(0.0).notNull(),
    priority: varchar('priority', { length: 50 }),
    status: varchar('status', { length: 50 }),
    assignedAgentName: varchar('assigned_agent_name', { length: 255 }),
    assignedTeamName: varchar('assigned_team_name', { length: 255 }),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversation_summary_tenant').on(table.tenantId),
      conversationUnique: uniqueIndex(
        'uq_conversation_summary_conversation',
      ).on(table.tenantId, table.conversationId),
      inboxIdx: index('idx_conversation_summary_inbox').on(
        table.tenantId,
        table.status,
        table.priority,
        table.lastMessageAt,
      ),
    };
  },
);

// 21. Conversation Assignments Table
export const conversationAssignments = supportAgentSchema.table(
  'conversation_assignments',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    agentProfileId: uuid('agent_profile_id').references(
      () => agentProfiles.id,
      { onDelete: 'set null' },
    ),
    teamId: uuid('team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: uuid('assigned_by'),
    assignmentType: varchar('assignment_type', { length: 50 })
      .default('MANUAL')
      .notNull(), // MANUAL, AUTO, ROUND_ROBIN, LEAST_LOADED, SKILL_BASED, PRIORITY_BASED
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversation_assignments_tenant').on(
        table.tenantId,
      ),
      conversationIdx: index('idx_conversation_assignments_conversation').on(
        table.tenantId,
        table.conversationId,
      ),
      agentIdx: index('idx_conversation_assignments_agent').on(
        table.tenantId,
        table.agentProfileId,
      ),
    };
  },
);

// 22. Conversation Tags Table
export const conversationTags = supportAgentSchema.table(
  'conversation_tags',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    tag: varchar('tag', { length: 100 }).notNull(),
    color: varchar('color', { length: 20 }),
    isSystemTag: boolean('is_system_tag').default(false).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversation_tags_tenant').on(table.tenantId),
      tagUnique: uniqueIndex('uq_conversation_tags').on(
        table.tenantId,
        table.conversationId,
        table.tag,
      ),
      tagSearchIdx: index('idx_conversation_tags_search').on(
        table.tenantId,
        table.tag,
      ),
    };
  },
);

// 23. Conversation Notes Table (internal only)
export const conversationNotes = supportAgentSchema.table(
  'conversation_notes',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: uuid('author_id').notNull(),
    note: text('note').notNull(),
    visibility: varchar('visibility', { length: 50 })
      .default('INTERNAL')
      .notNull(), // INTERNAL, PRIVATE
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversation_notes_tenant').on(table.tenantId),
      conversationIdx: index('idx_conversation_notes_conversation').on(
        table.tenantId,
        table.conversationId,
      ),
    };
  },
);

// 24. Conversation Participants Table
export const conversationParticipants = supportAgentSchema.table(
  'conversation_participants',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    participantId: uuid('participant_id').notNull(),
    participantType: varchar('participant_type', { length: 50 }).notNull(), // CUSTOMER, AGENT, BOT, OBSERVER
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversation_participants_tenant').on(
        table.tenantId,
      ),
      participantUnique: uniqueIndex('uq_conversation_participants').on(
        table.tenantId,
        table.conversationId,
        table.participantId,
      ),
    };
  },
);

// 25. Conversation Mentions Table
export const conversationMentions = supportAgentSchema.table(
  'conversation_mentions',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    mentionedUserId: uuid('mentioned_user_id').notNull(),
    mentionedBy: uuid('mentioned_by').notNull(),
    messageReference: varchar('message_reference', { length: 255 }),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_conversation_mentions_tenant').on(table.tenantId),
      mentionedUserIdx: index('idx_conversation_mentions_user').on(
        table.tenantId,
        table.mentionedUserId,
      ),
      conversationIdx: index('idx_conversation_mentions_conversation').on(
        table.tenantId,
        table.conversationId,
      ),
    };
  },
);
