import {
  pgSchema,
  uuid,
  timestamp,
  varchar,
  text,
  integer,
  bigint,
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

// 26. Messages Table (partition-ready: (tenant_id, conversation_id, created_at))
export const messages = supportAgentSchema.table(
  'messages',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    channelId: uuid('channel_id').references(() => channels.id, {
      onDelete: 'set null',
    }),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    senderId: uuid('sender_id'),
    senderType: varchar('sender_type', { length: 50 }).notNull(), // CUSTOMER, AGENT, BOT, SYSTEM, AI
    messageType: varchar('message_type', { length: 50 })
      .default('TEXT')
      .notNull(), // TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT, LOCATION, CONTACT, STICKER, SYSTEM, AI_RESPONSE, INTERNAL_NOTE
    direction: varchar('direction', { length: 20 }).notNull(), // INBOUND, OUTBOUND
    content: text('content'),
    contentHtml: text('content_html'),
    status: varchar('status', { length: 50 }).default('QUEUED').notNull(), // QUEUED, PROCESSING, SENT, DELIVERED, READ, FAILED, RETRYING, ARCHIVED
    externalMessageId: varchar('external_message_id', { length: 255 }),
    replyToMessageId: uuid('reply_to_message_id'),
    threadId: uuid('thread_id'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    readAt: timestamp('read_at'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_messages_tenant').on(table.tenantId),
      conversationIdx: index('idx_messages_conversation').on(
        table.tenantId,
        table.conversationId,
        table.createdAt,
      ),
      threadIdx: index('idx_messages_thread').on(
        table.tenantId,
        table.threadId,
      ),
      statusIdx: index('idx_messages_status').on(
        table.tenantId,
        table.status,
      ),
      directionIdx: index('idx_messages_direction').on(
        table.tenantId,
        table.conversationId,
        table.direction,
      ),
      customerIdx: index('idx_messages_customer').on(
        table.tenantId,
        table.customerId,
      ),
      channelIdx: index('idx_messages_channel').on(
        table.tenantId,
        table.channelId,
      ),
      // Deduplication of inbound provider messages
      externalUnique: uniqueIndex('uq_messages_external').on(
        table.tenantId,
        table.channelId,
        table.externalMessageId,
      ),
    };
  },
);

// 27. Message Attachments Table
export const messageAttachments = supportAgentSchema.table(
  'message_attachments',
  {
    ...commonColumns,
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileType: varchar('file_type', { length: 100 }),
    fileSize: bigint('file_size', { mode: 'number' }),
    storageProvider: varchar('storage_provider', { length: 100 }),
    storagePath: varchar('storage_path', { length: 1000 }),
    publicUrl: varchar('public_url', { length: 1000 }),
    checksum: varchar('checksum', { length: 255 }),
    thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_message_attachments_tenant').on(table.tenantId),
      messageIdx: index('idx_message_attachments_message').on(
        table.tenantId,
        table.messageId,
      ),
      checksumIdx: index('idx_message_attachments_checksum').on(
        table.tenantId,
        table.checksum,
      ),
    };
  },
);

// 28. Message Delivery Status Table
export const messageDeliveryStatus = supportAgentSchema.table(
  'message_delivery_status',
  {
    ...commonColumns,
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 100 }),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull(), // QUEUED, SENT, DELIVERED, READ, FAILED, RETRYING
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastAttemptAt: timestamp('last_attempt_at'),
    failureReason: text('failure_reason'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_message_delivery_tenant').on(table.tenantId),
      messageIdx: index('idx_message_delivery_message').on(
        table.tenantId,
        table.messageId,
      ),
      providerMessageIdx: index('idx_message_delivery_provider_msg').on(
        table.tenantId,
        table.providerMessageId,
      ),
    };
  },
);

// 29. Message Reactions Table
export const messageReactions = supportAgentSchema.table(
  'message_reactions',
  {
    ...commonColumns,
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').notNull(),
    reaction: varchar('reaction', { length: 50 }).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_message_reactions_tenant').on(table.tenantId),
      messageIdx: index('idx_message_reactions_message').on(
        table.tenantId,
        table.messageId,
      ),
      reactionUnique: uniqueIndex('uq_message_reactions').on(
        table.tenantId,
        table.messageId,
        table.userId,
        table.reaction,
      ),
    };
  },
);

// 30. Message Mentions Table
export const messageMentions = supportAgentSchema.table(
  'message_mentions',
  {
    ...commonColumns,
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    mentionedUserId: uuid('mentioned_user_id').notNull(),
    mentionedBy: uuid('mentioned_by').notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_message_mentions_tenant').on(table.tenantId),
      messageIdx: index('idx_message_mentions_message').on(
        table.tenantId,
        table.messageId,
      ),
      mentionedUserIdx: index('idx_message_mentions_user').on(
        table.tenantId,
        table.mentionedUserId,
      ),
    };
  },
);

// 31. Message Templates Table
export const messageTemplates = supportAgentSchema.table(
  'message_templates',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    channelType: varchar('channel_type', { length: 50 }),
    category: varchar('category', { length: 100 }),
    content: text('content').notNull(),
    contentHtml: text('content_html'),
    variables: jsonb('variables'),
    language: varchar('language', { length: 10 }).default('en').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_message_templates_tenant').on(table.tenantId),
      nameUnique: uniqueIndex('uq_message_templates_name').on(
        table.tenantId,
        table.name,
      ),
      categoryIdx: index('idx_message_templates_category').on(
        table.tenantId,
        table.category,
      ),
    };
  },
);

// 32. Message Drafts Table
export const messageDrafts = supportAgentSchema.table(
  'message_drafts',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: uuid('author_id').notNull(),
    draftContent: text('draft_content').notNull(),
    draftType: varchar('draft_type', { length: 50 }).default('TEXT').notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_message_drafts_tenant').on(table.tenantId),
      draftUnique: uniqueIndex('uq_message_drafts').on(
        table.tenantId,
        table.conversationId,
        table.authorId,
      ),
      expiresIdx: index('idx_message_drafts_expires').on(table.expiresAt),
    };
  },
);

// 33. Ticket Categories Table
export const ticketCategories = supportAgentSchema.table(
  'ticket_categories',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 20 }),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_categories_tenant').on(table.tenantId),
      nameUnique: uniqueIndex('uq_ticket_categories_name').on(
        table.tenantId,
        table.name,
      ),
    };
  },
);

// 34. Tickets Table
export const tickets = supportAgentSchema.table(
  'tickets',
  {
    ...commonColumns,
    ticketNumber: varchar('ticket_number', { length: 50 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    assignedAgentId: uuid('assigned_agent_id').references(
      () => agentProfiles.id,
      { onDelete: 'set null' },
    ),
    assignedTeamId: uuid('assigned_team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    categoryId: uuid('category_id').references(() => ticketCategories.id, {
      onDelete: 'set null',
    }),
    priority: varchar('priority', { length: 50 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, URGENT, CRITICAL
    status: varchar('status', { length: 50 }).default('OPEN').notNull(), // OPEN, ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER, WAITING_INTERNAL, APPROVAL_PENDING, RESOLVED, CLOSED, REOPENED, CANCELLED
    source: varchar('source', { length: 50 }).default('MANUAL').notNull(), // MANUAL, CONVERSATION, AI_ESCALATION, EMAIL, WHATSAPP, WEBCHAT, API, WORKFLOW
    subject: varchar('subject', { length: 500 }).notNull(),
    description: text('description'),
    resolutionSummary: text('resolution_summary'),
    openedAt: timestamp('opened_at').defaultNow().notNull(),
    firstResponseAt: timestamp('first_response_at'),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_tickets_tenant').on(table.tenantId),
      numberUnique: uniqueIndex('uq_tickets_number').on(
        table.tenantId,
        table.ticketNumber,
      ),
      queueIdx: index('idx_tickets_queue').on(
        table.tenantId,
        table.status,
        table.priority,
        table.openedAt,
      ),
      agentIdx: index('idx_tickets_agent').on(
        table.tenantId,
        table.assignedAgentId,
        table.status,
      ),
      teamIdx: index('idx_tickets_team').on(
        table.tenantId,
        table.assignedTeamId,
        table.status,
      ),
      customerIdx: index('idx_tickets_customer').on(
        table.tenantId,
        table.customerId,
      ),
      categoryIdx: index('idx_tickets_category').on(
        table.tenantId,
        table.categoryId,
      ),
      conversationIdx: index('idx_tickets_conversation').on(
        table.tenantId,
        table.conversationId,
      ),
    };
  },
);

// 35. Ticket Comments Table
export const ticketComments = supportAgentSchema.table(
  'ticket_comments',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: uuid('author_id').notNull(),
    comment: text('comment').notNull(),
    visibility: varchar('visibility', { length: 50 })
      .default('PUBLIC')
      .notNull(), // PUBLIC, INTERNAL
    attachmentsCount: integer('attachments_count').default(0).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_comments_tenant').on(table.tenantId),
      ticketIdx: index('idx_ticket_comments_ticket').on(
        table.tenantId,
        table.ticketId,
        table.createdAt,
      ),
    };
  },
);

// 36. Ticket Attachments Table
export const ticketAttachments = supportAgentSchema.table(
  'ticket_attachments',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    commentId: uuid('comment_id').references(() => ticketComments.id, {
      onDelete: 'cascade',
    }),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileType: varchar('file_type', { length: 100 }),
    fileSize: bigint('file_size', { mode: 'number' }),
    fileUrl: varchar('file_url', { length: 1000 }),
    checksum: varchar('checksum', { length: 255 }),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_attachments_tenant').on(table.tenantId),
      ticketIdx: index('idx_ticket_attachments_ticket').on(
        table.tenantId,
        table.ticketId,
      ),
      commentIdx: index('idx_ticket_attachments_comment').on(
        table.tenantId,
        table.commentId,
      ),
    };
  },
);

// 37. Ticket Assignments Table
export const ticketAssignments = supportAgentSchema.table(
  'ticket_assignments',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    agentId: uuid('agent_id').references(() => agentProfiles.id, {
      onDelete: 'set null',
    }),
    teamId: uuid('team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    assignmentType: varchar('assignment_type', { length: 50 })
      .default('MANUAL')
      .notNull(), // MANUAL, AUTO, ROUND_ROBIN, LEAST_LOADED, SKILL_BASED, PRIORITY_BASED, TRANSFER, ESCALATION
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: uuid('assigned_by'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_assignments_tenant').on(table.tenantId),
      ticketIdx: index('idx_ticket_assignments_ticket').on(
        table.tenantId,
        table.ticketId,
      ),
      agentIdx: index('idx_ticket_assignments_agent').on(
        table.tenantId,
        table.agentId,
      ),
    };
  },
);

// 38. Ticket SLA Table
export const ticketSla = supportAgentSchema.table(
  'ticket_sla',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    policyId: uuid('policy_id'),
    responseDueAt: timestamp('response_due_at'),
    resolutionDueAt: timestamp('resolution_due_at'),
    breached: boolean('breached').default(false).notNull(),
    breachedAt: timestamp('breached_at'),
    remainingSeconds: integer('remaining_seconds'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_sla_tenant').on(table.tenantId),
      ticketUnique: uniqueIndex('uq_ticket_sla_ticket').on(
        table.tenantId,
        table.ticketId,
      ),
      // Drives the high-throughput SLA monitor sweep.
      dueIdx: index('idx_ticket_sla_due').on(
        table.tenantId,
        table.breached,
        table.resolutionDueAt,
      ),
    };
  },
);

// 39. Ticket Tags Table
export const ticketTags = supportAgentSchema.table(
  'ticket_tags',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    tag: varchar('tag', { length: 100 }).notNull(),
    color: varchar('color', { length: 20 }),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_tags_tenant').on(table.tenantId),
      tagUnique: uniqueIndex('uq_ticket_tags').on(
        table.tenantId,
        table.ticketId,
        table.tag,
      ),
      tagSearchIdx: index('idx_ticket_tags_search').on(
        table.tenantId,
        table.tag,
      ),
    };
  },
);

// 40. Ticket Watchers Table
export const ticketWatchers = supportAgentSchema.table(
  'ticket_watchers',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').notNull(),
    notificationPreferences: jsonb('notification_preferences'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_watchers_tenant').on(table.tenantId),
      watcherUnique: uniqueIndex('uq_ticket_watchers').on(
        table.tenantId,
        table.ticketId,
        table.userId,
      ),
    };
  },
);

// 41. Ticket Approvals Table
export const ticketApprovals = supportAgentSchema.table(
  'ticket_approvals',
  {
    ...commonColumns,
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    approverId: uuid('approver_id').notNull(),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
    type: varchar('type', { length: 50 }).default('CUSTOM').notNull(), // REFUND, CREDIT, ESCALATION, CUSTOM
    comments: text('comments'),
    approvedAt: timestamp('approved_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ticket_approvals_tenant').on(table.tenantId),
      ticketIdx: index('idx_ticket_approvals_ticket').on(
        table.tenantId,
        table.ticketId,
      ),
      approverIdx: index('idx_ticket_approvals_approver').on(
        table.tenantId,
        table.approverId,
        table.status,
      ),
    };
  },
);

// 42. Knowledge Categories Table
export const knowledgeCategories = supportAgentSchema.table(
  'knowledge_categories',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    parentCategoryId: uuid('parent_category_id'),
    color: varchar('color', { length: 20 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_categories_tenant').on(table.tenantId),
      nameUnique: uniqueIndex('uq_knowledge_categories_name').on(
        table.tenantId,
        table.name,
      ),
      parentIdx: index('idx_knowledge_categories_parent').on(
        table.tenantId,
        table.parentCategoryId,
      ),
    };
  },
);

// 43. Knowledge Tags Table
export const knowledgeTags = supportAgentSchema.table(
  'knowledge_tags',
  {
    ...commonColumns,
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 20 }),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_tags_tenant').on(table.tenantId),
      nameUnique: uniqueIndex('uq_knowledge_tags_name').on(
        table.tenantId,
        table.name,
      ),
    };
  },
);

// 44. Knowledge Sources Table
export const knowledgeSources = supportAgentSchema.table(
  'knowledge_sources',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    sourceType: varchar('source_type', { length: 50 }).notNull(), // PDF, DOCX, TXT, CSV, MARKDOWN, FAQ, WEBSITE, SITEMAP, URL, CONFLUENCE, NOTION, GOOGLE_DOC, MANUAL
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, PAUSED, DISABLED
    syncStatus: varchar('sync_status', { length: 50 })
      .default('PENDING')
      .notNull(), // PENDING, SYNCING, SYNCED, FAILED
    uri: text('uri'),
    connectorId: uuid('connector_id'),
    config: jsonb('config'),
    documentCount: integer('document_count').default(0).notNull(),
    lastSyncedAt: timestamp('last_synced_at'),
    lastError: text('last_error'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_sources_tenant').on(table.tenantId),
      typeIdx: index('idx_knowledge_sources_type').on(
        table.tenantId,
        table.sourceType,
        table.status,
      ),
      syncIdx: index('idx_knowledge_sources_sync').on(
        table.tenantId,
        table.syncStatus,
      ),
      connectorIdx: index('idx_knowledge_sources_connector').on(
        table.tenantId,
        table.connectorId,
      ),
    };
  },
);

// 45. Knowledge Documents Table
export const knowledgeDocuments = supportAgentSchema.table(
  'knowledge_documents',
  {
    ...commonColumns,
    sourceId: uuid('source_id')
      .references(() => knowledgeSources.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id').references(() => knowledgeCategories.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 600 }).notNull(),
    documentType: varchar('document_type', { length: 50 })
      .default('MANUAL')
      .notNull(), // PDF, DOCX, TXT, CSV, MARKDOWN, FAQ, HTML, WEBPAGE, MANUAL
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, PROCESSING, INDEXING, ACTIVE, ARCHIVED, FAILED
    language: varchar('language', { length: 16 }).default('en').notNull(),
    version: integer('doc_version').default(1).notNull(),
    syncStatus: varchar('sync_status', { length: 50 })
      .default('PENDING')
      .notNull(), // PENDING, SYNCING, SYNCED, FAILED
    ingestionStatus: varchar('ingestion_status', { length: 50 })
      .default('PENDING')
      .notNull(), // PENDING, INGESTING, INGESTED, FAILED
    embeddingStatus: varchar('embedding_status', { length: 50 })
      .default('PENDING')
      .notNull(), // PENDING, EMBEDDING, EMBEDDED, FAILED
    externalRef: varchar('external_ref', { length: 255 }),
    sourceUri: text('source_uri'),
    contentHash: varchar('content_hash', { length: 128 }),
    chunkCount: integer('chunk_count').default(0).notNull(),
    fileUrl: text('file_url'),
    storageProvider: varchar('storage_provider', { length: 100 }),
    fileSize: bigint('file_size', { mode: 'number' }),
    mimeType: varchar('mime_type', { length: 255 }),
    checksum: varchar('checksum', { length: 128 }),
    tags: jsonb('tags'),
    publishedAt: timestamp('published_at'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_documents_tenant').on(table.tenantId),
      slugUnique: uniqueIndex('uq_knowledge_documents_slug').on(
        table.tenantId,
        table.slug,
      ),
      sourceIdx: index('idx_knowledge_documents_source').on(
        table.tenantId,
        table.sourceId,
      ),
      statusIdx: index('idx_knowledge_documents_status').on(
        table.tenantId,
        table.status,
        table.language,
      ),
      categoryIdx: index('idx_knowledge_documents_category').on(
        table.tenantId,
        table.categoryId,
      ),
      syncIdx: index('idx_knowledge_documents_sync').on(
        table.tenantId,
        table.syncStatus,
      ),
    };
  },
);

// 46. Knowledge Chunks Table
export const knowledgeChunks = supportAgentSchema.table(
  'knowledge_chunks',
  {
    ...commonColumns,
    documentId: uuid('document_id')
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' })
      .notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    chunkHash: varchar('chunk_hash', { length: 128 }).notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').default(0).notNull(),
    externalRef: varchar('external_ref', { length: 255 }),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_chunks_tenant').on(table.tenantId),
      documentIdx: index('idx_knowledge_chunks_document').on(
        table.tenantId,
        table.documentId,
        table.chunkIndex,
      ),
      chunkUnique: uniqueIndex('uq_knowledge_chunks_index').on(
        table.tenantId,
        table.documentId,
        table.chunkIndex,
      ),
    };
  },
);

// 47. Knowledge Sync Jobs Table
export const knowledgeSyncJobs = supportAgentSchema.table(
  'knowledge_sync_jobs',
  {
    ...commonColumns,
    sourceId: uuid('source_id')
      .references(() => knowledgeSources.id, { onDelete: 'cascade' })
      .notNull(),
    documentId: uuid('document_id').references(() => knowledgeDocuments.id, {
      onDelete: 'set null',
    }),
    jobType: varchar('job_type', { length: 50 }).notNull(), // SYNC, CRAWL, INGEST, INDEX, CLEANUP
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, RUNNING, COMPLETED, FAILED
    totalItems: integer('total_items').default(0).notNull(),
    processedItems: integer('processed_items').default(0).notNull(),
    failedItems: integer('failed_items').default(0).notNull(),
    error: text('error'),
    stats: jsonb('stats'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_sync_jobs_tenant').on(table.tenantId),
      sourceIdx: index('idx_knowledge_sync_jobs_source').on(
        table.tenantId,
        table.sourceId,
        table.status,
      ),
      statusIdx: index('idx_knowledge_sync_jobs_status').on(
        table.tenantId,
        table.status,
        table.createdAt,
      ),
    };
  },
);

// 48. Knowledge Versions Table
export const knowledgeVersions = supportAgentSchema.table(
  'knowledge_versions',
  {
    ...commonColumns,
    documentId: uuid('document_id')
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' })
      .notNull(),
    versionNumber: integer('version_number').notNull(),
    changeSummary: text('change_summary'),
    contentHash: varchar('content_hash', { length: 128 }),
    snapshot: jsonb('snapshot'),
    publishedBy: uuid('published_by'),
    publishedAt: timestamp('published_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_versions_tenant').on(table.tenantId),
      documentIdx: index('idx_knowledge_versions_document').on(
        table.tenantId,
        table.documentId,
        table.versionNumber,
      ),
      versionUnique: uniqueIndex('uq_knowledge_versions_number').on(
        table.tenantId,
        table.documentId,
        table.versionNumber,
      ),
    };
  },
);

// 49. Knowledge Permissions Table
export const knowledgePermissions = supportAgentSchema.table(
  'knowledge_permissions',
  {
    ...commonColumns,
    documentId: uuid('document_id')
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' })
      .notNull(),
    teamId: uuid('team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    role: varchar('role', { length: 100 }),
    accessLevel: varchar('access_level', { length: 50 })
      .default('READ')
      .notNull(), // READ, WRITE, MANAGE
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_permissions_tenant').on(table.tenantId),
      documentIdx: index('idx_knowledge_permissions_document').on(
        table.tenantId,
        table.documentId,
      ),
      grantUnique: uniqueIndex('uq_knowledge_permissions_grant').on(
        table.tenantId,
        table.documentId,
        table.teamId,
        table.role,
      ),
    };
  },
);

// 50. Knowledge Search Logs Table
export const knowledgeSearchLogs = supportAgentSchema.table(
  'knowledge_search_logs',
  {
    ...commonColumns,
    userId: uuid('user_id'),
    query: text('query').notNull(),
    filters: jsonb('filters'),
    resultsCount: integer('results_count').default(0).notNull(),
    latencyMs: integer('latency_ms').default(0).notNull(),
    source: varchar('source', { length: 50 }).default('API').notNull(), // API, AI_AGENT, WIDGET
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_knowledge_search_logs_tenant').on(table.tenantId),
      createdIdx: index('idx_knowledge_search_logs_created').on(
        table.tenantId,
        table.createdAt,
      ),
    };
  },
);
