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
      statusIdx: index('idx_messages_status').on(table.tenantId, table.status),
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
    /** Timestamp when the SLA clock was most recently paused (null = running). */
    pausedAt: timestamp('paused_at'),
    /** Total cumulative seconds paused across all pause windows. */
    pausedSeconds: integer('paused_seconds').default(0).notNull(),
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

// 51. Connectors Table
export const connectors = supportAgentSchema.table(
  'connectors',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 300 }).notNull(),
    connectorType: varchar('connector_type', { length: 50 }).notNull(), // REST_API, GRAPHQL, WEBHOOK, SHOPIFY, WOOCOMMERCE, MAGENTO, HUBSPOT, SALESFORCE, ZOHO, JIRA, CUSTOM
    description: text('description'),
    baseUrl: text('base_url'),
    authType: varchar('auth_type', { length: 50 }).default('NONE').notNull(), // NONE, API_KEY, BEARER, BASIC, OAUTH2, HMAC
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, PAUSED, DISABLED, ERROR
    healthStatus: varchar('health_status', { length: 50 })
      .default('UNKNOWN')
      .notNull(), // UNKNOWN, HEALTHY, DEGRADED, UNHEALTHY
    openApiSpec: jsonb('openapi_spec'),
    config: jsonb('config'),
    lastHealthCheckAt: timestamp('last_health_check_at'),
    lastError: text('last_error'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connectors_tenant').on(table.tenantId),
      slugUnique: uniqueIndex('uq_connectors_slug').on(
        table.tenantId,
        table.slug,
      ),
      typeIdx: index('idx_connectors_type').on(
        table.tenantId,
        table.connectorType,
        table.status,
      ),
      healthIdx: index('idx_connectors_health').on(
        table.tenantId,
        table.healthStatus,
      ),
    };
  },
);

// 52. Connector Instances Table
export const connectorInstances = supportAgentSchema.table(
  'connector_instances',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    environment: varchar('environment', { length: 50 })
      .default('production')
      .notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, PAUSED, DISABLED
    healthStatus: varchar('health_status', { length: 50 })
      .default('UNKNOWN')
      .notNull(),
    config: jsonb('config'),
    lastHealthCheckAt: timestamp('last_health_check_at'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_instances_tenant').on(table.tenantId),
      connectorIdx: index('idx_connector_instances_connector').on(
        table.tenantId,
        table.connectorId,
        table.status,
      ),
    };
  },
);

// 53. Connector Capabilities Table
export const connectorCapabilities = supportAgentSchema.table(
  'connector_capabilities',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    capabilityType: varchar('capability_type', { length: 60 }).notNull(), // ORDER_TRACKING, PRODUCT_SEARCH, ... CUSTOM_ACTION
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    method: varchar('method', { length: 10 }).default('GET').notNull(), // GET, POST, PUT, PATCH, DELETE
    path: text('path').notNull(),
    requestMapping: jsonb('request_mapping'),
    responseMapping: jsonb('response_mapping'),
    inputSchema: jsonb('input_schema'),
    outputSchema: jsonb('output_schema'),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_capabilities_tenant').on(
        table.tenantId,
      ),
      connectorIdx: index('idx_connector_capabilities_connector').on(
        table.tenantId,
        table.connectorId,
      ),
      capabilityUnique: uniqueIndex('uq_connector_capabilities_type').on(
        table.tenantId,
        table.connectorId,
        table.capabilityType,
      ),
    };
  },
);

// 54. Connector Credentials Table
export const connectorCredentials = supportAgentSchema.table(
  'connector_credentials',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    instanceId: uuid('instance_id').references(() => connectorInstances.id, {
      onDelete: 'cascade',
    }),
    authType: varchar('auth_type', { length: 50 }).default('NONE').notNull(),
    encryptedData: text('encrypted_data').notNull(),
    keyId: varchar('key_id', { length: 100 }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, EXPIRED, ROTATING, REVOKED
    expiresAt: timestamp('expires_at'),
    rotatedAt: timestamp('rotated_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_credentials_tenant').on(table.tenantId),
      connectorIdx: index('idx_connector_credentials_connector').on(
        table.tenantId,
        table.connectorId,
        table.status,
      ),
    };
  },
);

// 55. Connector Logs Table
export const connectorLogs = supportAgentSchema.table(
  'connector_logs',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    instanceId: uuid('instance_id'),
    executionId: uuid('execution_id'),
    level: varchar('level', { length: 20 }).default('INFO').notNull(), // DEBUG, INFO, WARN, ERROR
    message: text('message').notNull(),
    context: jsonb('context'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_logs_tenant').on(table.tenantId),
      connectorIdx: index('idx_connector_logs_connector').on(
        table.tenantId,
        table.connectorId,
        table.createdAt,
      ),
    };
  },
);

// 56. Connector Executions Table
export const connectorExecutions = supportAgentSchema.table(
  'connector_executions',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    instanceId: uuid('instance_id'),
    capabilityId: uuid('capability_id'),
    capabilityType: varchar('capability_type', { length: 60 }).notNull(),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, RUNNING, SUCCESS, FAILED, RETRYING, CIRCUIT_OPEN
    statusCode: integer('status_code'),
    requestPayload: jsonb('request_payload'),
    responsePayload: jsonb('response_payload'),
    error: text('error'),
    attempt: integer('attempt').default(1).notNull(),
    latencyMs: integer('latency_ms').default(0).notNull(),
    workflowId: uuid('workflow_id'),
    conversationId: uuid('conversation_id'),
    ticketId: uuid('ticket_id'),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_executions_tenant').on(table.tenantId),
      connectorIdx: index('idx_connector_executions_connector').on(
        table.tenantId,
        table.connectorId,
        table.status,
        table.createdAt,
      ),
      capabilityIdx: index('idx_connector_executions_capability').on(
        table.tenantId,
        table.capabilityType,
      ),
      idempotencyIdx: index('idx_connector_executions_idempotency').on(
        table.tenantId,
        table.idempotencyKey,
      ),
    };
  },
);

// 57. Connector Webhooks Table
export const connectorWebhooks = supportAgentSchema.table(
  'connector_webhooks',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    instanceId: uuid('instance_id'),
    url: text('url').notNull(),
    secret: text('secret'),
    signatureHeader: varchar('signature_header', { length: 100 })
      .default('x-signature')
      .notNull(),
    events: jsonb('events'),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE
    lastTriggeredAt: timestamp('last_triggered_at'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_webhooks_tenant').on(table.tenantId),
      connectorIdx: index('idx_connector_webhooks_connector').on(
        table.tenantId,
        table.connectorId,
      ),
    };
  },
);

// 58. Connector Rate Limits Table
export const connectorRateLimits = supportAgentSchema.table(
  'connector_rate_limits',
  {
    ...commonColumns,
    connectorId: uuid('connector_id')
      .references(() => connectors.id, { onDelete: 'cascade' })
      .notNull(),
    instanceId: uuid('instance_id'),
    windowSeconds: integer('window_seconds').default(60).notNull(),
    maxRequests: integer('max_requests').default(1000).notNull(),
    currentUsage: integer('current_usage').default(0).notNull(),
    resetAt: timestamp('reset_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_connector_rate_limits_tenant').on(table.tenantId),
      connectorUnique: uniqueIndex('uq_connector_rate_limits_connector').on(
        table.tenantId,
        table.connectorId,
      ),
    };
  },
);

// 59. AI Agents Table
export const aiAgents = supportAgentSchema.table(
  'ai_agents',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    agentType: varchar('agent_type', { length: 50 }).notNull(), // CUSTOMER_SUPPORT, SALES, RETENTION, BILLING, TECHNICAL, ONBOARDING, CUSTOM
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, INACTIVE
    defaultWorkflow: varchar('default_workflow', { length: 255 }),
    systemPromptReference: text('system_prompt_reference'),
    configuration: jsonb('configuration'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_agents_tenant').on(table.tenantId),
      typeIdx: index('idx_ai_agents_type').on(table.tenantId, table.agentType),
    };
  },
);

// 60. AI Agent Profiles Table
export const aiAgentProfiles = supportAgentSchema.table(
  'ai_agent_profiles',
  {
    ...commonColumns,
    agentId: uuid('agent_id')
      .references(() => aiAgents.id, { onDelete: 'cascade' })
      .notNull(),
    knowledgeScope: jsonb('knowledge_scope'),
    connectorScope: jsonb('connector_scope'),
    languageSupport: jsonb('language_support'),
    escalationRules: jsonb('escalation_rules'),
    configuration: jsonb('configuration'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_agent_profiles_tenant').on(table.tenantId),
      agentIdx: index('idx_ai_agent_profiles_agent').on(
        table.tenantId,
        table.agentId,
      ),
    };
  },
);

// 61. AI Conversation Sessions Table
export const aiConversationSessions = supportAgentSchema.table(
  'ai_conversation_sessions',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    customerId: uuid('customer_id').notNull(),
    agentId: uuid('agent_id')
      .references(() => aiAgents.id, { onDelete: 'cascade' })
      .notNull(),
    workflowExecutionId: uuid('workflow_execution_id'),
    sessionState: jsonb('session_state'),
    lastInteractionAt: timestamp('last_interaction_at'),
    contextVersion: integer('context_version').default(1).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_sessions_tenant').on(table.tenantId),
      convUnique: uniqueIndex('uq_ai_sessions_conv').on(
        table.tenantId,
        table.conversationId,
      ),
      agentIdx: index('idx_ai_sessions_agent').on(
        table.tenantId,
        table.agentId,
      ),
    };
  },
);

// 62. AI Workflow Executions Table
export const aiWorkflowExecutions = supportAgentSchema.table(
  'ai_workflow_executions',
  {
    ...commonColumns,
    workflowId: varchar('workflow_id', { length: 255 }).notNull(),
    conversationId: uuid('conversation_id').notNull(),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, RUNNING, COMPLETED, FAILED, RETRYING, TIMEOUT
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    executionTimeMs: integer('execution_time_ms').default(0).notNull(),
    tokensUsed: integer('tokens_used').default(0).notNull(),
    estimatedCost: doublePrecision('estimated_cost').default(0.0).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_workflows_tenant').on(table.tenantId),
      convIdx: index('idx_ai_workflows_conv').on(
        table.tenantId,
        table.conversationId,
      ),
      statusIdx: index('idx_ai_workflows_status').on(
        table.tenantId,
        table.status,
      ),
    };
  },
);

// 63. AI Tool Requests Table
export const aiToolRequests = supportAgentSchema.table(
  'ai_tool_requests',
  {
    ...commonColumns,
    workflowExecutionId: uuid('workflow_execution_id')
      .references(() => aiWorkflowExecutions.id, { onDelete: 'cascade' })
      .notNull(),
    toolName: varchar('tool_name', { length: 255 }).notNull(),
    capability: varchar('capability', { length: 255 }).notNull(),
    payload: jsonb('payload'),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, SUCCESS, FAILED
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_tool_req_tenant').on(table.tenantId),
      execIdx: index('idx_ai_tool_req_exec').on(
        table.tenantId,
        table.workflowExecutionId,
      ),
    };
  },
);

// 64. AI Tool Results Table
export const aiToolResults = supportAgentSchema.table(
  'ai_tool_results',
  {
    ...commonColumns,
    toolRequestId: uuid('tool_request_id')
      .references(() => aiToolRequests.id, { onDelete: 'cascade' })
      .notNull(),
    response: jsonb('response'),
    status: varchar('status', { length: 50 }).default('SUCCESS').notNull(),
    completedAt: timestamp('completed_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_tool_res_tenant').on(table.tenantId),
      reqIdx: index('idx_ai_tool_res_req').on(
        table.tenantId,
        table.toolRequestId,
      ),
    };
  },
);

// 65. AI Escalations Table
export const aiEscalations = supportAgentSchema.table(
  'ai_escalations',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    reason: text('reason').notNull(),
    confidenceScore: doublePrecision('confidence_score'),
    sentimentScore: doublePrecision('sentiment_score'),
    escalatedTo: varchar('escalated_to', { length: 100 }).notNull(), // AGENT, TEAM, MANAGER
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, RESOLVED
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_escalations_tenant').on(table.tenantId),
      convIdx: index('idx_ai_escalations_conv').on(
        table.tenantId,
        table.conversationId,
      ),
      statusIdx: index('idx_ai_escalations_status').on(
        table.tenantId,
        table.status,
      ),
    };
  },
);

// 66. AI Response Logs Table
export const aiResponseLogs = supportAgentSchema.table(
  'ai_response_logs',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    messageId: uuid('message_id').notNull(),
    workflowExecutionId: uuid('workflow_execution_id').references(
      () => aiWorkflowExecutions.id,
      { onDelete: 'set null' },
    ),
    responseType: varchar('response_type', { length: 50 }).notNull(), // AUTOMATED, CO_PILOT, SUGGESTION
    responseTimeMs: integer('response_time_ms').default(0).notNull(),
    confidenceScore: doublePrecision('confidence_score'),
    tokensUsed: integer('tokens_used').default(0).notNull(),
    cost: doublePrecision('cost').default(0.0).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_resp_logs_tenant').on(table.tenantId),
      convIdx: index('idx_ai_resp_logs_conv').on(
        table.tenantId,
        table.conversationId,
      ),
    };
  },
);

// 67. AI Usage Metrics Table
export const aiUsageMetrics = supportAgentSchema.table(
  'ai_usage_metrics',
  {
    ...commonColumns,
    agentId: uuid('agent_id')
      .references(() => aiAgents.id, { onDelete: 'cascade' })
      .notNull(),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    requests: integer('requests').default(0).notNull(),
    tokens: integer('tokens').default(0).notNull(),
    cost: doublePrecision('cost').default(0.0).notNull(),
    workflowCount: integer('workflow_count').default(0).notNull(),
    toolCalls: integer('tool_calls').default(0).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_usage_tenant').on(table.tenantId),
      agentDateIdx: uniqueIndex('uq_ai_usage_agent_date').on(
        table.tenantId,
        table.agentId,
        table.date,
      ),
    };
  },
);

// 68. AI Model Configurations Table
export const aiModelConfigurations = supportAgentSchema.table(
  'ai_model_configurations',
  {
    ...commonColumns,
    agentId: uuid('agent_id')
      .references(() => aiAgents.id, { onDelete: 'cascade' })
      .notNull(),
    modelName: varchar('model_name', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 100 }).notNull(),
    temperature: doublePrecision('temperature').default(0.7).notNull(),
    maxTokens: integer('max_tokens').default(2048).notNull(),
    topP: doublePrecision('top_p').default(1.0).notNull(),
    presencePenalty: doublePrecision('presence_penalty').default(0.0).notNull(),
    frequencyPenalty: doublePrecision('frequency_penalty')
      .default(0.0)
      .notNull(),
    stopSequences: jsonb('stop_sequences'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_ai_model_config_tenant').on(table.tenantId),
      agentIdx: index('idx_ai_model_config_agent').on(
        table.tenantId,
        table.agentId,
      ),
    };
  },
);

// 69. Workflow Templates Table
export const workflowTemplates = supportAgentSchema.table(
  'workflow_templates',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    workflowType: varchar('workflow_type', { length: 50 }).notNull(), // TICKET_WORKFLOW, CONVERSATION_WORKFLOW, ESCALATION_WORKFLOW, APPROVAL_WORKFLOW, CUSTOMER_WORKFLOW, CONNECTOR_WORKFLOW, AI_WORKFLOW, SCHEDULED_WORKFLOW, CUSTOM_WORKFLOW
    status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, PAUSED, ARCHIVED, FAILED, COMPLETED
    isSystem: boolean('is_system').default(false).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_wf_templates_tenant').on(table.tenantId),
      statusIdx: index('idx_wf_templates_status').on(
        table.tenantId,
        table.status,
      ),
    };
  },
);

// 70. Workflow Versions Table
export const workflowVersions = supportAgentSchema.table(
  'workflow_versions',
  {
    ...commonColumns,
    workflowTemplateId: uuid('workflow_template_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    versionNumber: integer('version_number').notNull(),
    definition: jsonb('definition').notNull(),
    isActive: boolean('is_active').default(false).notNull(),
  },
  (table) => {
    return {
      templateIdx: index('idx_wf_versions_template').on(
        table.tenantId,
        table.workflowTemplateId,
      ),
    };
  },
);

// 71. Workflow Executions Table
export const workflowExecutions = supportAgentSchema.table(
  'workflow_executions',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    executionStatus: varchar('execution_status', { length: 50 })
      .default('RUNNING')
      .notNull(), // DRAFT, ACTIVE, PAUSED, ARCHIVED, FAILED, COMPLETED
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    executionTimeMs: integer('execution_time_ms').default(0).notNull(),
    triggerSource: varchar('trigger_source', { length: 50 }).notNull(), // CONVERSATION_CREATED, MESSAGE_RECEIVED, etc.
    triggerReferenceId: varchar('trigger_reference_id', { length: 255 }),
    context: jsonb('context').notNull(),
    result: jsonb('result'),
    error: jsonb('error'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_wf_exec_tenant').on(table.tenantId),
      wfIdx: index('idx_wf_exec_wf').on(table.tenantId, table.workflowId),
      statusIdx: index('idx_wf_exec_status').on(
        table.tenantId,
        table.executionStatus,
      ),
    };
  },
);

// 72. Workflow Triggers Table
export const workflowTriggers = supportAgentSchema.table(
  'workflow_triggers',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    triggerType: varchar('trigger_type', { length: 50 }).notNull(), // CONVERSATION_CREATED, MESSAGE_RECEIVED, etc.
    configuration: jsonb('configuration'),
  },
  (table) => {
    return {
      wfIdx: index('idx_wf_triggers_wf').on(table.tenantId, table.workflowId),
    };
  },
);

// 73. Workflow Conditions Table
export const workflowConditions = supportAgentSchema.table(
  'workflow_conditions',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    triggerId: uuid('trigger_id').references(() => workflowTriggers.id, {
      onDelete: 'cascade',
    }),
    field: varchar('field', { length: 255 }).notNull(),
    operator: varchar('operator', { length: 50 }).notNull(), // EQUALS, CONTAINS, GT, LT
    value: varchar('value', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      wfIdx: index('idx_wf_cond_wf').on(table.tenantId, table.workflowId),
    };
  },
);

// 74. Workflow Actions Table
export const workflowActions = supportAgentSchema.table(
  'workflow_actions',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    actionType: varchar('action_type', { length: 50 }).notNull(), // CREATE_TICKET, SEND_MESSAGE, etc.
    configuration: jsonb('configuration').notNull(),
    sequenceOrder: integer('sequence_order').notNull(),
  },
  (table) => {
    return {
      wfIdx: index('idx_wf_actions_wf').on(table.tenantId, table.workflowId),
    };
  },
);

// 75. Workflow Approvals Table
export const workflowApprovals = supportAgentSchema.table(
  'workflow_approvals',
  {
    ...commonColumns,
    workflowExecutionId: uuid('workflow_execution_id')
      .references(() => workflowExecutions.id, { onDelete: 'cascade' })
      .notNull(),
    approverId: uuid('approver_id').notNull(),
    approvalStatus: varchar('approval_status', { length: 50 })
      .default('PENDING')
      .notNull(), // PENDING, APPROVED, REJECTED
    comments: text('comments'),
    approvedAt: timestamp('approved_at'),
    expiresAt: timestamp('expires_at'),
  },
  (table) => {
    return {
      execIdx: index('idx_wf_approvals_exec').on(
        table.tenantId,
        table.workflowExecutionId,
      ),
    };
  },
);

// 76. Workflow Schedules Table
export const workflowSchedules = supportAgentSchema.table(
  'workflow_schedules',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
    timezone: varchar('timezone', { length: 100 }).default('UTC').notNull(),
    nextRunAt: timestamp('next_run_at'),
    lastRunAt: timestamp('last_run_at'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => {
    return {
      wfIdx: index('idx_wf_schedules_wf').on(table.tenantId, table.workflowId),
    };
  },
);

// 77. Workflow Audit Logs Table
export const workflowAuditLogs = supportAgentSchema.table(
  'workflow_audit_logs',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id').references(() => workflowTemplates.id, {
      onDelete: 'cascade',
    }),
    workflowExecutionId: uuid('workflow_execution_id').references(
      () => workflowExecutions.id,
      { onDelete: 'set null' },
    ),
    action: varchar('action', { length: 100 }).notNull(),
    details: text('details'),
    metadata: jsonb('metadata'),
  },
  (table) => {
    return {
      tenantIdIdx: index('idx_wf_audit_tenant').on(table.tenantId),
      wfIdx: index('idx_wf_audit_wf').on(table.tenantId, table.workflowId),
    };
  },
);

// 78. Workflow Variables Table
export const workflowVariables = supportAgentSchema.table(
  'workflow_variables',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id')
      .references(() => workflowTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // string, number, boolean, json
    value: text('value'),
  },
  (table) => {
    return {
      wfIdx: index('idx_wf_vars_wf').on(table.tenantId, table.workflowId),
      uqWfVar: uniqueIndex('uq_wf_var').on(
        table.tenantId,
        table.workflowId,
        table.name,
      ),
    };
  },
);

// 79. Analytics Events
export const analyticsEvents = supportAgentSchema.table(
  'analytics_events',
  {
    ...commonColumns,
    eventName: varchar('event_name', { length: 255 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    userId: uuid('user_id'),
    timestamp: timestamp('timestamp').notNull(),
    payload: jsonb('payload').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('idx_an_ev_tenant').on(table.tenantId),
    eventIdx: index('idx_an_ev_name').on(table.tenantId, table.eventName),
    tsIdx: index('idx_an_ev_ts').on(table.timestamp),
  }),
);

// 80. Analytics Daily Metrics
export const analyticsDailyMetrics = supportAgentSchema.table(
  'analytics_daily_metrics',
  {
    ...commonColumns,
    metricType: varchar('metric_type', { length: 100 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    value: numeric('value').notNull(),
    dimensions: jsonb('dimensions'),
  },
  (table) => ({
    tenantIdx: index('idx_an_daily_tenant').on(table.tenantId),
    metricIdx: index('idx_an_daily_metric').on(
      table.tenantId,
      table.metricType,
    ),
    tsIdx: index('idx_an_daily_ts').on(table.timestamp),
  }),
);

// 81. Analytics Hourly Metrics
export const analyticsHourlyMetrics = supportAgentSchema.table(
  'analytics_hourly_metrics',
  {
    ...commonColumns,
    metricType: varchar('metric_type', { length: 100 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    value: numeric('value').notNull(),
    dimensions: jsonb('dimensions'),
  },
  (table) => ({
    tenantIdx: index('idx_an_hourly_tenant').on(table.tenantId),
    metricIdx: index('idx_an_hourly_metric').on(
      table.tenantId,
      table.metricType,
    ),
    tsIdx: index('idx_an_hourly_ts').on(table.timestamp),
  }),
);

// 82. Analytics Tenant Metrics
export const analyticsTenantMetrics = supportAgentSchema.table(
  'analytics_tenant_metrics',
  {
    ...commonColumns,
    timestamp: timestamp('timestamp').notNull(),
    conversationsCount: integer('conversations_count').default(0).notNull(),
    messagesCount: integer('messages_count').default(0).notNull(),
    ticketsCount: integer('tickets_count').default(0).notNull(),
    resolvedTicketsCount: integer('resolved_tickets_count')
      .default(0)
      .notNull(),
    averageResponseTime: numeric('average_response_time')
      .default('0')
      .notNull(),
    averageResolutionTime: numeric('average_resolution_time')
      .default('0')
      .notNull(),
    csatScore: numeric('csat_score').default('0').notNull(),
    slaViolationRate: numeric('sla_violation_rate').default('0').notNull(),
    estimatedCostSavings: numeric('estimated_cost_savings')
      .default('0')
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_tenant_m_tenant').on(table.tenantId),
    tsIdx: index('idx_an_tenant_m_ts').on(table.timestamp),
  }),
);

// 83. Analytics Agent Metrics
export const analyticsAgentMetrics = supportAgentSchema.table(
  'analytics_agent_metrics',
  {
    ...commonColumns,
    agentId: uuid('agent_id').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    assignedConversations: integer('assigned_conversations')
      .default(0)
      .notNull(),
    resolvedConversations: integer('resolved_conversations')
      .default(0)
      .notNull(),
    assignedTickets: integer('assigned_tickets').default(0).notNull(),
    resolvedTickets: integer('resolved_tickets').default(0).notNull(),
    averageResponseTime: numeric('average_response_time')
      .default('0')
      .notNull(),
    averageResolutionTime: numeric('average_resolution_time')
      .default('0')
      .notNull(),
    csatScore: numeric('csat_score').default('0').notNull(),
    workload: integer('workload').default(0).notNull(),
    utilization: numeric('utilization').default('0').notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_agent_m_tenant').on(table.tenantId),
    agentIdx: index('idx_an_agent_m_agent').on(table.tenantId, table.agentId),
    tsIdx: index('idx_an_agent_m_ts').on(table.timestamp),
  }),
);

// 84. Analytics Channel Metrics
export const analyticsChannelMetrics = supportAgentSchema.table(
  'analytics_channel_metrics',
  {
    ...commonColumns,
    channelId: uuid('channel_id').notNull(),
    channelType: varchar('channel_type', { length: 50 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    messageCount: integer('message_count').default(0).notNull(),
    conversationCount: integer('conversation_count').default(0).notNull(),
    responseTime: numeric('response_time').default('0').notNull(),
    deliverySuccessRate: numeric('delivery_success_rate')
      .default('0')
      .notNull(),
    failureRate: numeric('failure_rate').default('0').notNull(),
    usageVolume: integer('usage_volume').default(0).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_channel_m_tenant').on(table.tenantId),
    channelIdx: index('idx_an_channel_m_chan').on(
      table.tenantId,
      table.channelId,
    ),
    tsIdx: index('idx_an_channel_m_ts').on(table.timestamp),
  }),
);

// 85. Analytics AI Metrics
export const analyticsAiMetrics = supportAgentSchema.table(
  'analytics_ai_metrics',
  {
    ...commonColumns,
    timestamp: timestamp('timestamp').notNull(),
    aiRequests: integer('ai_requests').default(0).notNull(),
    tokensUsed: bigint('tokens_used', { mode: 'number' }).default(0).notNull(),
    promptTokens: bigint('prompt_tokens', { mode: 'number' })
      .default(0)
      .notNull(),
    completionTokens: bigint('completion_tokens', { mode: 'number' })
      .default(0)
      .notNull(),
    estimatedCost: numeric('estimated_cost').default('0').notNull(),
    responseTime: numeric('response_time').default('0').notNull(),
    escalationRate: numeric('escalation_rate').default('0').notNull(),
    aiResolutionRate: numeric('ai_resolution_rate').default('0').notNull(),
    humanResolutionRate: numeric('human_resolution_rate')
      .default('0')
      .notNull(),
    workflowExecutions: integer('workflow_executions').default(0).notNull(),
    toolCalls: integer('tool_calls').default(0).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_ai_m_tenant').on(table.tenantId),
    tsIdx: index('idx_an_ai_m_ts').on(table.timestamp),
  }),
);

// 86. Analytics Ticket Metrics
export const analyticsTicketMetrics = supportAgentSchema.table(
  'analytics_ticket_metrics',
  {
    ...commonColumns,
    timestamp: timestamp('timestamp').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    priority: varchar('priority', { length: 50 }).notNull(),
    ticketCount: integer('ticket_count').default(0).notNull(),
    responseTime: numeric('response_time').default('0').notNull(),
    resolutionTime: numeric('resolution_time').default('0').notNull(),
    slaViolationsCount: integer('sla_violations_count').default(0).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_ticket_m_tenant').on(table.tenantId),
    tsIdx: index('idx_an_ticket_m_ts').on(table.timestamp),
  }),
);

// 87. Analytics Workflow Metrics
export const analyticsWorkflowMetrics = supportAgentSchema.table(
  'analytics_workflow_metrics',
  {
    ...commonColumns,
    workflowId: uuid('workflow_id').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    executionCount: integer('execution_count').default(0).notNull(),
    successCount: integer('success_count').default(0).notNull(),
    failureCount: integer('failure_count').default(0).notNull(),
    averageDuration: numeric('average_duration').default('0').notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_wf_m_tenant').on(table.tenantId),
    wfIdx: index('idx_an_wf_m_wf').on(table.tenantId, table.workflowId),
    tsIdx: index('idx_an_wf_m_ts').on(table.timestamp),
  }),
);

// 88. Analytics Customer Metrics
export const analyticsCustomerMetrics = supportAgentSchema.table(
  'analytics_customer_metrics',
  {
    ...commonColumns,
    customerId: uuid('customer_id').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    lifetimeValue: numeric('lifetime_value').default('0').notNull(),
    conversationCount: integer('conversation_count').default(0).notNull(),
    ticketCount: integer('ticket_count').default(0).notNull(),
    sentimentScore: numeric('sentiment_score').default('0').notNull(),
    retentionScore: numeric('retention_score').default('0').notNull(),
    riskScore: numeric('risk_score').default('0').notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_an_cust_m_tenant').on(table.tenantId),
    custIdx: index('idx_an_cust_m_cust').on(table.tenantId, table.customerId),
    tsIdx: index('idx_an_cust_m_ts').on(table.timestamp),
  }),
);

// 89. Analytics Reports
export const analyticsReports = supportAgentSchema.table(
  'analytics_reports',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    reportType: varchar('report_type', { length: 50 }).notNull(),
    timeRange: varchar('time_range', { length: 50 }).notNull(),
    filters: jsonb('filters'),
    parameters: jsonb('parameters'),
    data: jsonb('data'),
  },
  (table) => ({
    tenantIdx: index('idx_an_rep_tenant').on(table.tenantId),
  }),
);

// 90. Analytics Report Schedules
export const analyticsReportSchedules = supportAgentSchema.table(
  'analytics_report_schedules',
  {
    ...commonColumns,
    reportId: uuid('report_id')
      .references(() => analyticsReports.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    cronExpression: varchar('cron_expression', { length: 50 }).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    exportFormat: varchar('export_format', { length: 20 }).notNull(),
    recipients: jsonb('recipients').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    nextRunAt: timestamp('next_run_at'),
    lastRunAt: timestamp('last_run_at'),
  },
  (table) => ({
    tenantIdx: index('idx_an_sched_tenant').on(table.tenantId),
    reportIdx: index('idx_an_sched_rep').on(table.tenantId, table.reportId),
  }),
);

// 91. Tenant Settings Table
export const tenantSettings = supportAgentSchema.table(
  'tenant_settings',
  {
    ...commonColumns,
    tenantName: varchar('tenant_name', { length: 255 }).notNull(),
    industry: varchar('industry', { length: 100 }),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    locale: varchar('locale', { length: 10 }).default('en').notNull(),
    country: varchar('country', { length: 50 }),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    supportEmail: varchar('support_email', { length: 255 }),
    supportPhone: varchar('support_phone', { length: 50 }),
    websiteUrl: varchar('website_url', { length: 255 }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_settings_tenant').on(table.tenantId),
  }),
);

// 92. Tenant Preferences Table
export const tenantPreferences = supportAgentSchema.table(
  'tenant_preferences',
  {
    ...commonColumns,
    theme: varchar('theme', { length: 50 }).default('light').notNull(),
    notificationsEnabled: boolean('notifications_enabled')
      .default(true)
      .notNull(),
    autoResolveDays: integer('auto_resolve_days').default(3).notNull(),
    autoCloseDays: integer('auto_close_days').default(7).notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_preferences_tenant').on(table.tenantId),
  }),
);

// 93. Tenant Branding Table
export const tenantBranding = supportAgentSchema.table(
  'tenant_branding',
  {
    ...commonColumns,
    logoUrl: varchar('logo_url', { length: 500 }),
    faviconUrl: varchar('favicon_url', { length: 500 }),
    primaryColor: varchar('primary_color', { length: 20 })
      .default('#000000')
      .notNull(),
    secondaryColor: varchar('secondary_color', { length: 20 })
      .default('#ffffff')
      .notNull(),
    themeMode: varchar('theme_mode', { length: 20 }).default('LIGHT').notNull(),
    emailHeader: text('email_header'),
    emailFooter: text('email_footer'),
    customCss: text('custom_css'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_branding_tenant').on(table.tenantId),
  }),
);

// 94. Tenant Business Hours Table
export const tenantBusinessHours = supportAgentSchema.table(
  'tenant_business_hours',
  {
    ...commonColumns,
    dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, ..., 6 = Saturday
    startTime: varchar('start_time', { length: 8 })
      .default('09:00:00')
      .notNull(),
    endTime: varchar('end_time', { length: 8 }).default('17:00:00').notNull(),
    isOpen: boolean('is_open').default(true).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_bus_hours_tenant').on(table.tenantId),
    dayOfWeekIdx: index('idx_tenant_bus_hours_day').on(
      table.tenantId,
      table.dayOfWeek,
    ),
  }),
);

// 95. Tenant Holidays Table
export const tenantHolidays = supportAgentSchema.table(
  'tenant_holidays',
  {
    ...commonColumns,
    holidayName: varchar('holiday_name', { length: 255 }).notNull(),
    holidayDate: timestamp('holiday_date').notNull(),
    isRecurring: boolean('is_recurring').default(false).notNull(),
    country: varchar('country', { length: 50 }),
    region: varchar('region', { length: 50 }),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_holidays_tenant').on(table.tenantId),
    dateIdx: index('idx_tenant_holidays_date').on(
      table.tenantId,
      table.holidayDate,
    ),
  }),
);

// 96. Tenant Feature Flags Table
export const tenantFeatureFlags = supportAgentSchema.table(
  'tenant_feature_flags',
  {
    ...commonColumns,
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    enabled: boolean('enabled').default(false).notNull(),
    rolloutPercentage: integer('rollout_percentage').default(100).notNull(),
    configuration: jsonb('configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_feat_flags_tenant').on(table.tenantId),
    keyIdx: uniqueIndex('uq_tenant_feat_flags_key').on(
      table.tenantId,
      table.featureKey,
    ),
  }),
);

// 97. Tenant AI Settings Table
export const tenantAiSettings = supportAgentSchema.table(
  'tenant_ai_settings',
  {
    ...commonColumns,
    defaultAgent: varchar('default_agent', { length: 255 }),
    confidenceThreshold: doublePrecision('confidence_threshold')
      .default(0.7)
      .notNull(),
    escalationThreshold: doublePrecision('escalation_threshold')
      .default(0.4)
      .notNull(),
    allowedLanguages: jsonb('allowed_languages').default('[]').notNull(),
    defaultLanguage: varchar('default_language', { length: 10 })
      .default('en')
      .notNull(),
    autoResponseEnabled: boolean('auto_response_enabled')
      .default(true)
      .notNull(),
    autoEscalationEnabled: boolean('auto_escalation_enabled')
      .default(true)
      .notNull(),
    costLimitDaily: numeric('cost_limit_daily', { precision: 10, scale: 2 }),
    costLimitMonthly: numeric('cost_limit_monthly', {
      precision: 10,
      scale: 2,
    }),
    modelConfiguration: jsonb('model_configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_ai_settings_tenant').on(table.tenantId),
  }),
);

// 98. Tenant Channel Settings Table
export const tenantChannelSettings = supportAgentSchema.table(
  'tenant_channel_settings',
  {
    ...commonColumns,
    channelType: varchar('channel_type', { length: 50 }).notNull(), // EMAIL, WEB_CHAT, SMS, WHATSAPP, etc.
    enabled: boolean('enabled').default(true).notNull(),
    businessHoursOnly: boolean('business_hours_only').default(false).notNull(),
    autoAssignmentEnabled: boolean('auto_assignment_enabled')
      .default(true)
      .notNull(),
    configuration: jsonb('configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_chan_settings_tenant').on(table.tenantId),
    typeIdx: uniqueIndex('uq_tenant_chan_settings_type').on(
      table.tenantId,
      table.channelType,
    ),
  }),
);

// 99. Tenant Notification Settings Table
export const tenantNotificationSettings = supportAgentSchema.table(
  'tenant_notification_settings',
  {
    ...commonColumns,
    emailEnabled: boolean('email_enabled').default(true).notNull(),
    smsEnabled: boolean('sms_enabled').default(false).notNull(),
    pushEnabled: boolean('push_enabled').default(true).notNull(),
    webhookEnabled: boolean('webhook_enabled').default(false).notNull(),
    digestEnabled: boolean('digest_enabled').default(false).notNull(),
    configuration: jsonb('configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_notif_settings_tenant').on(table.tenantId),
  }),
);

// 100. Tenant SLA Settings Table
export const tenantSlaSettings = supportAgentSchema.table(
  'tenant_sla_settings',
  {
    ...commonColumns,
    responseTimeTarget: integer('response_time_target').default(3600).notNull(), // In seconds
    resolutionTimeTarget: integer('resolution_time_target')
      .default(86400)
      .notNull(), // In seconds
    escalationTimeTarget: integer('escalation_time_target')
      .default(14400)
      .notNull(), // In seconds
    businessHoursOnly: boolean('business_hours_only').default(true).notNull(),
    configuration: jsonb('configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_sla_settings_tenant').on(table.tenantId),
  }),
);

// 101. Tenant Security Settings Table
export const tenantSecuritySettings = supportAgentSchema.table(
  'tenant_security_settings',
  {
    ...commonColumns,
    sessionTimeout: integer('session_timeout').default(3600).notNull(), // In seconds
    ipWhitelist: jsonb('ip_whitelist').default('[]').notNull(),
    mfaRequired: boolean('mfa_required').default(false).notNull(),
    apiKeyRotationDays: integer('api_key_rotation_days').default(90).notNull(),
    auditRetentionDays: integer('audit_retention_days').default(365).notNull(),
    configuration: jsonb('configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_sec_settings_tenant').on(table.tenantId),
  }),
);

// 102. Tenant Widget Settings Table
export const tenantWidgetSettings = supportAgentSchema.table(
  'tenant_widget_settings',
  {
    ...commonColumns,
    widgetName: varchar('widget_name', { length: 255 })
      .default('Live Support')
      .notNull(),
    widgetColor: varchar('widget_color', { length: 20 })
      .default('#1A73E8')
      .notNull(),
    widgetPosition: varchar('widget_position', { length: 50 })
      .default('BOTTOM_RIGHT')
      .notNull(),
    welcomeMessage: text('welcome_message'),
    offlineMessage: text('offline_message'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    customCss: text('custom_css'),
    customJs: text('custom_js'),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_widget_settings_tenant').on(table.tenantId),
  }),
);

// 103. Tenant Usage Limits Table
export const tenantUsageLimits = supportAgentSchema.table(
  'tenant_usage_limits',
  {
    ...commonColumns,
    maxAgents: integer('max_agents').default(5).notNull(),
    maxConversations: integer('max_conversations').default(1000).notNull(),
    maxMessages: integer('max_messages').default(10000).notNull(),
    maxWorkflows: integer('max_workflows').default(10).notNull(),
    maxConnectors: integer('max_connectors').default(5).notNull(),
    maxDocuments: integer('max_documents').default(100).notNull(),
    maxStorage: bigint('max_storage', { mode: 'number' })
      .default(1073741824)
      .notNull(), // 1 GB in bytes
    maxAiRequests: integer('max_ai_requests').default(5000).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_usage_limits_tenant').on(table.tenantId),
  }),
);

// 104. Inbox Views Table
export const inboxViews = supportAgentSchema.table(
  'inbox_views',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    customerId: uuid('customer_id'),
    channelId: uuid('channel_id'),
    assignedAgentId: uuid('assigned_agent_id'),
    assignedTeamId: uuid('assigned_team_id'),
    status: varchar('status', { length: 50 }).notNull(), // OPEN, SNOOZED, RESOLVED, ARCHIVED, etc.
    priority: varchar('priority', { length: 50 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, URGENT
    sentiment: varchar('sentiment', { length: 50 }), // POSITIVE, NEUTRAL, NEGATIVE
    lastMessage: text('last_message'),
    lastMessageAt: timestamp('last_message_at'),
    lastMessageType: varchar('last_message_type', { length: 50 }), // TEXT, IMAGE, FILE, etc.
    unreadCount: integer('unread_count').default(0).notNull(),
    openTicketCount: integer('open_ticket_count').default(0).notNull(),
    aiConfidenceScore: doublePrecision('ai_confidence_score'),
    waitingSince: timestamp('waiting_since'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_views_tenant').on(table.tenantId),
    convTenantUnique: uniqueIndex('uq_inbox_views_conv_tenant').on(
      table.tenantId,
      table.conversationId,
    ),
    statusIdx: index('idx_inbox_views_status').on(table.tenantId, table.status),
    agentIdx: index('idx_inbox_views_agent').on(
      table.tenantId,
      table.assignedAgentId,
    ),
    teamIdx: index('idx_inbox_views_team').on(
      table.tenantId,
      table.assignedTeamId,
    ),
  }),
);

// 105. Inbox Filters Table
export const inboxFilters = supportAgentSchema.table(
  'inbox_filters',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    filterDefinition: jsonb('filter_definition').notNull(),
    isSystem: boolean('is_system').default(false).notNull(),
    isShared: boolean('is_shared').default(false).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_filters_tenant').on(table.tenantId),
  }),
);

// 106. Inbox Saved Views Table
export const inboxSavedViews = supportAgentSchema.table(
  'inbox_saved_views',
  {
    ...commonColumns,
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    filterId: uuid('filter_id').notNull(),
    sortConfiguration: jsonb('sort_configuration'),
    columnConfiguration: jsonb('column_configuration'),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_saved_views_tenant').on(table.tenantId),
    userViewIdx: index('idx_inbox_saved_views_user').on(
      table.tenantId,
      table.userId,
    ),
  }),
);

// 107. Inbox Assignments Table
export const inboxAssignments = supportAgentSchema.table(
  'inbox_assignments',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    assignedAgentId: uuid('assigned_agent_id'),
    assignedTeamId: uuid('assigned_team_id'),
    assignmentType: varchar('assignment_type', { length: 50 }).notNull(), // ROUND_ROBIN, FORCE, TRANSFER, AUTO
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_assignments_tenant').on(table.tenantId),
    convIdx: index('idx_inbox_assignments_conv').on(
      table.tenantId,
      table.conversationId,
    ),
  }),
);

// 108. Inbox Presence Table
export const inboxPresence = supportAgentSchema.table(
  'inbox_presence',
  {
    ...commonColumns,
    userId: uuid('user_id').notNull(),
    status: varchar('status', { length: 50 }).notNull(), // ONLINE, OFFLINE, AWAY, BUSY
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    activeConversationId: uuid('active_conversation_id'),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_presence_tenant').on(table.tenantId),
    userTenantUnique: uniqueIndex('uq_inbox_presence_user_tenant').on(
      table.tenantId,
      table.userId,
    ),
  }),
);

// 109. Inbox Snoozes Table
export const inboxSnoozes = supportAgentSchema.table(
  'inbox_snoozes',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    snoozedUntil: timestamp('snoozed_until').notNull(),
    reason: varchar('reason', { length: 255 }),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_snoozes_tenant').on(table.tenantId),
    convTenantUnique: uniqueIndex('uq_inbox_snoozes_conv_tenant').on(
      table.tenantId,
      table.conversationId,
    ),
  }),
);

// 110. Inbox Bookmarks Table
export const inboxBookmarks = supportAgentSchema.table(
  'inbox_bookmarks',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    userId: uuid('user_id').notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_bookmarks_tenant').on(table.tenantId),
    userConvUnique: uniqueIndex('uq_inbox_bookmarks_user_conv').on(
      table.tenantId,
      table.userId,
      table.conversationId,
    ),
  }),
);

// 111. Inbox Activity Feed Table
export const inboxActivityFeed = supportAgentSchema.table(
  'inbox_activity_feed',
  {
    ...commonColumns,
    conversationId: uuid('conversation_id').notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(), // ASSIGNED, SNOOZED, BOOKMARKED, MESSAGE, WORKFLOW, TICKET
    actorId: uuid('actor_id'), // User ID, Agent ID, or SYSTEM (NULL)
    eventData: jsonb('event_data'),
  },
  (table) => ({
    tenantIdx: index('idx_inbox_activity_tenant').on(table.tenantId),
    convIdx: index('idx_inbox_activity_conv').on(
      table.tenantId,
      table.conversationId,
    ),
  }),
);

// 112. Admin Dashboards Table
export const adminDashboards = supportAgentSchema.table(
  'admin_dashboards',
  {
    ...commonColumns,
    dashboardName: varchar('dashboard_name', { length: 255 }).notNull(),
    layout: jsonb('layout'),
    widgets: jsonb('widgets'),
    defaultView: boolean('default_view').default(false).notNull(),
    permissions: jsonb('permissions'),
  },
  (table) => ({
    tenantIdx: index('idx_admin_dashboards_tenant').on(table.tenantId),
    nameUnique: uniqueIndex('uq_admin_dashboards_tenant_name').on(
      table.tenantId,
      table.dashboardName,
    ),
  }),
);

// 113. Admin Widgets Table
export const adminWidgets = supportAgentSchema.table(
  'admin_widgets',
  {
    ...commonColumns,
    dashboardId: uuid('dashboard_id').notNull(),
    widgetType: varchar('widget_type', { length: 50 }).notNull(), // CONVERSATION_METRICS, TICKET_METRICS, AI_METRICS, WORKFLOW_METRICS, CONNECTOR_METRICS, CUSTOMER_METRICS, AGENT_METRICS, REVENUE_METRICS, SLA_METRICS, SYSTEM_HEALTH
    title: varchar('title', { length: 255 }).notNull(),
    position: jsonb('position'),
    configuration: jsonb('configuration'),
    refreshIntervalSeconds: integer('refresh_interval_seconds')
      .default(60)
      .notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_admin_widgets_tenant').on(table.tenantId),
    dashboardIdx: index('idx_admin_widgets_dashboard').on(
      table.tenantId,
      table.dashboardId,
    ),
  }),
);

// 114. Admin Announcements Table
export const adminAnnouncements = supportAgentSchema.table(
  'admin_announcements',
  {
    ...commonColumns,
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    severity: varchar('severity', { length: 20 }).default('INFO').notNull(), // INFO, WARNING, CRITICAL
    audience: varchar('audience', { length: 50 }).default('ALL').notNull(), // ALL, TENANT_ADMIN, SUPPORT_AGENT
    isActive: boolean('is_active').default(true).notNull(),
    startsAt: timestamp('starts_at').defaultNow().notNull(),
    endsAt: timestamp('ends_at'),
  },
  (table) => ({
    tenantIdx: index('idx_admin_announcements_tenant').on(table.tenantId),
    activeIdx: index('idx_admin_announcements_active').on(
      table.tenantId,
      table.isActive,
    ),
  }),
);

// 115. Admin Audit Views Table
export const adminAuditViews = supportAgentSchema.table(
  'admin_audit_views',
  {
    ...commonColumns,
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    filterDefinition: jsonb('filter_definition').notNull(),
    isShared: boolean('is_shared').default(false).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_admin_audit_views_tenant').on(table.tenantId),
    userIdx: index('idx_admin_audit_views_user').on(
      table.tenantId,
      table.userId,
    ),
  }),
);

// 116. Admin Feature Access Table
export const adminFeatureAccess = supportAgentSchema.table(
  'admin_feature_access',
  {
    ...commonColumns,
    featureKey: varchar('feature_key', { length: 150 }).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    plan: varchar('plan', { length: 50 }),
    grantedBy: uuid('granted_by'),
    notes: text('notes'),
  },
  (table) => ({
    tenantIdx: index('idx_admin_feature_access_tenant').on(table.tenantId),
    featureUnique: uniqueIndex('uq_admin_feature_access_tenant_key').on(
      table.tenantId,
      table.featureKey,
    ),
  }),
);

// 117. Admin API Keys Table
export const adminApiKeys = supportAgentSchema.table(
  'admin_api_keys',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    keyHash: varchar('key_hash', { length: 128 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
    scopes: jsonb('scopes').notNull(),
    expiresAt: timestamp('expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // ACTIVE, REVOKED, EXPIRED
    revokedAt: timestamp('revoked_at'),
    usageCount: bigint('usage_count', { mode: 'number' }).default(0).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_admin_api_keys_tenant').on(table.tenantId),
    hashUnique: uniqueIndex('uq_admin_api_keys_hash').on(table.keyHash),
    statusIdx: index('idx_admin_api_keys_status').on(
      table.tenantId,
      table.status,
    ),
  }),
);

// 118. Admin Webhooks Table
export const adminWebhooks = supportAgentSchema.table(
  'admin_webhooks',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    secretEncrypted: text('secret_encrypted').notNull(),
    events: jsonb('events').notNull(),
    retryPolicy: jsonb('retry_policy'),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // ACTIVE, DISABLED, FAILING
    lastDeliveryAt: timestamp('last_delivery_at'),
    lastDeliveryStatus: varchar('last_delivery_status', { length: 20 }),
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_admin_webhooks_tenant').on(table.tenantId),
    statusIdx: index('idx_admin_webhooks_status').on(
      table.tenantId,
      table.status,
    ),
  }),
);

// 119. Admin Operational Incidents Table
export const adminOperationalIncidents = supportAgentSchema.table(
  'admin_operational_incidents',
  {
    ...commonColumns,
    title: varchar('title', { length: 255 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(), // LOW, MEDIUM, HIGH, CRITICAL
    status: varchar('status', { length: 20 }).default('OPEN').notNull(), // OPEN, INVESTIGATING, MONITORING, RESOLVED
    affectedService: varchar('affected_service', { length: 100 }).notNull(),
    description: text('description'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => ({
    tenantIdx: index('idx_admin_incidents_tenant').on(table.tenantId),
    statusIdx: index('idx_admin_incidents_status').on(
      table.tenantId,
      table.status,
    ),
    severityIdx: index('idx_admin_incidents_severity').on(
      table.tenantId,
      table.severity,
    ),
  }),
);

// 120. Admin System Health Table
export const adminSystemHealth = supportAgentSchema.table(
  'admin_system_health',
  {
    ...commonColumns,
    serviceName: varchar('service_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // HEALTHY, DEGRADED, DOWN
    latencyMs: integer('latency_ms'),
    errorRate: doublePrecision('error_rate'),
    lastCheckAt: timestamp('last_check_at').defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('idx_admin_system_health_tenant').on(table.tenantId),
    serviceUnique: uniqueIndex('uq_admin_system_health_tenant_service').on(
      table.tenantId,
      table.serviceName,
    ),
  }),
);

// 121. Admin Tenant Overrides Table
export const adminTenantOverrides = supportAgentSchema.table(
  'admin_tenant_overrides',
  {
    ...commonColumns,
    featureKey: varchar('feature_key', { length: 150 }).notNull(),
    overrideValue: jsonb('override_value').notNull(),
    reason: text('reason').notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    tenantIdx: index('idx_admin_tenant_overrides_tenant').on(table.tenantId),
    featureUnique: uniqueIndex('uq_admin_tenant_overrides_tenant_key').on(
      table.tenantId,
      table.featureKey,
    ),
  }),
);

// 122. Widget Configs Table
export const widgetConfigs = supportAgentSchema.table(
  'widget_configs',
  {
    ...commonColumns,
    widgetName: varchar('widget_name', { length: 255 }).notNull(),
    theme: varchar('theme', { length: 50 }).default('light').notNull(),
    primaryColor: varchar('primary_color', { length: 20 })
      .default('#000000')
      .notNull(),
    secondaryColor: varchar('secondary_color', { length: 20 })
      .default('#ffffff')
      .notNull(),
    position: varchar('position', { length: 20 })
      .default('bottom-right')
      .notNull(),
    welcomeMessage: text('welcome_message'),
    offlineMessage: text('offline_message'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    customCss: text('custom_css'),
    customJs: text('custom_js'),
    allowedDomains: jsonb('allowed_domains').default('[]').notNull(),
    // Per-tenant secret used to verify HMAC-signed identified-visitor requests
    // (POST /v1/widget/auth/verify) - never exposed via the public config endpoint.
    identityVerificationSecret: text('identity_verification_secret'),
  },
  (table) => ({
    tenantIdx: index('idx_widget_configs_tenant').on(table.tenantId),
  }),
);

// 123. Widget Visitors Table
export const widgetVisitors = supportAgentSchema.table(
  'widget_visitors',
  {
    ...commonColumns,
    anonymousId: varchar('anonymous_id', { length: 255 }).notNull(),
    customerId: uuid('customer_id'),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    name: varchar('name', { length: 255 }),
    country: varchar('country', { length: 100 }),
    city: varchar('city', { length: 100 }),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    visitCount: integer('visit_count').default(1).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_widget_visitors_tenant').on(table.tenantId),
    anonIdx: uniqueIndex('uq_widget_visitors_anon').on(
      table.tenantId,
      table.anonymousId,
    ),
    emailIdx: index('idx_widget_visitors_email').on(
      table.tenantId,
      table.email,
    ),
    customerIdx: index('idx_widget_visitors_cust').on(
      table.tenantId,
      table.customerId,
    ),
  }),
);

// 124. Widget Sessions Table
export const widgetSessions = supportAgentSchema.table(
  'widget_sessions',
  {
    ...commonColumns,
    visitorId: uuid('visitor_id').notNull(),
    sessionToken: varchar('session_token', { length: 500 }).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
    ipAddressHash: varchar('ip_address_hash', { length: 64 }),
    userAgent: varchar('user_agent', { length: 500 }),
    deviceType: varchar('device_type', { length: 50 }),
    browser: varchar('browser', { length: 50 }),
    os: varchar('os', { length: 50 }),
    referrer: varchar('referrer', { length: 1024 }),
    landingPage: varchar('landing_page', { length: 1024 }),
  },
  (table) => ({
    tenantIdx: index('idx_widget_sessions_tenant').on(table.tenantId),
    visitorIdx: index('idx_widget_sessions_visitor').on(table.visitorId),
    tokenIdx: uniqueIndex('uq_widget_sessions_token').on(
      table.tenantId,
      table.sessionToken,
    ),
  }),
);

// 125. Widget Identities Table
export const widgetIdentities = supportAgentSchema.table(
  'widget_identities',
  {
    ...commonColumns,
    visitorId: uuid('visitor_id').notNull(),
    externalUserId: varchar('external_user_id', { length: 255 }).notNull(),
    verificationMethod: varchar('verification_method', {
      length: 50,
    }).notNull(),
    verifiedAt: timestamp('verified_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_widget_identities_tenant').on(table.tenantId),
    visitorIdx: index('idx_widget_identities_visitor').on(table.visitorId),
    extUserIdx: uniqueIndex('uq_widget_identities_ext').on(
      table.tenantId,
      table.visitorId,
      table.externalUserId,
    ),
  }),
);

// 126. Widget Leads Table
export const widgetLeads = supportAgentSchema.table(
  'widget_leads',
  {
    ...commonColumns,
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    company: varchar('company', { length: 255 }),
    source: varchar('source', { length: 100 }).notNull(),
    leadScore: integer('lead_score').default(0).notNull(),
    status: varchar('status', { length: 50 }).default('NEW').notNull(),
    capturedAt: timestamp('captured_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_widget_leads_tenant').on(table.tenantId),
    emailIdx: index('idx_widget_leads_email').on(table.tenantId, table.email),
  }),
);

// 127. Widget Events Table
export const widgetEvents = supportAgentSchema.table(
  'widget_events',
  {
    ...commonColumns,
    sessionId: uuid('session_id').notNull(),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    eventData: jsonb('event_data'),
  },
  (table) => ({
    tenantIdx: index('idx_widget_events_tenant').on(table.tenantId),
    sessionIdx: index('idx_widget_events_session').on(table.sessionId),
  }),
);

// 128. Widget Page Views Table
export const widgetPageViews = supportAgentSchema.table(
  'widget_page_views',
  {
    ...commonColumns,
    sessionId: uuid('session_id').notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    title: varchar('title', { length: 500 }),
    timeSpentSeconds: integer('time_spent_seconds').default(0).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_widget_pvs_tenant').on(table.tenantId),
    sessionIdx: index('idx_widget_pvs_session').on(table.sessionId),
  }),
);

// 129. Widget Conversations Table
export const widgetConversations = supportAgentSchema.table(
  'widget_conversations',
  {
    ...commonColumns,
    widgetSessionId: uuid('widget_session_id').notNull(),
    conversationId: uuid('conversation_id').notNull(),
    linkedAt: timestamp('linked_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_widget_convs_tenant').on(table.tenantId),
    sessionIdx: index('idx_widget_convs_session').on(table.widgetSessionId),
    convIdx: index('idx_widget_convs_conv').on(table.conversationId),
  }),
);

// 130. Widget Auth Tokens Table
export const widgetAuthTokens = supportAgentSchema.table(
  'widget_auth_tokens',
  {
    ...commonColumns,
    visitorId: uuid('visitor_id').notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => ({
    tenantIdx: index('idx_widget_tokens_tenant').on(table.tenantId),
    visitorIdx: index('idx_widget_tokens_visitor').on(table.visitorId),
    hashIdx: uniqueIndex('uq_widget_tokens_hash').on(table.tokenHash),
  }),
);

// 131. Widget Installations Table
export const widgetInstallations = supportAgentSchema.table(
  'widget_installations',
  {
    ...commonColumns,
    domain: varchar('domain', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(),
    verificationToken: varchar('verification_token', { length: 255 }).notNull(),
    verifiedAt: timestamp('verified_at'),
  },
  (table) => ({
    tenantIdx: index('idx_widget_installs_tenant').on(table.tenantId),
    domainIdx: uniqueIndex('uq_widget_installs_domain').on(
      table.tenantId,
      table.domain,
    ),
  }),
);

// 132. Transactional Outbox Events Table
export const outboxEvents = supportAgentSchema.table(
  'outbox_events',
  {
    ...commonColumns,
    eventName: varchar('event_name', { length: 255 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, PROCESSED, FAILED
    attempts: integer('attempts').default(0).notNull(),
    lastError: text('last_error'),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    tenantIdx: index('idx_outbox_tenant').on(table.tenantId),
    statusIdx: index('idx_outbox_status').on(table.tenantId, table.status),
  }),
);
