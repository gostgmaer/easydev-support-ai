-- Production Hardening Database Indexing & Partitioning Script

-- 1. Tenant Indexes (Verify / enforce indexing of tenantId across core tables)
CREATE INDEX IF NOT EXISTS idx_customers_tenant_h ON ai_support_agent.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_h ON ai_support_agent.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_h ON ai_support_agent.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_h ON ai_support_agent.tickets(tenant_id);

-- 2. Composite Indexes
-- Conversation lookup by agent and status
CREATE INDEX IF NOT EXISTS idx_convs_tenant_assignee_status
ON ai_support_agent.conversations(tenant_id, assigned_agent_id, status);

-- Message lookup in conversation ordered by created date
CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
ON ai_support_agent.messages(conversation_id, created_at DESC);

-- Ticket category and status lookup
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_cat_status 
ON ai_support_agent.tickets(tenant_id, category_id, status);

-- 3. Partial Indexes (Exclude deleted or inactive records to reduce index size)
CREATE INDEX IF NOT EXISTS idx_customers_active_tenant 
ON ai_support_agent.customers(tenant_id) 
WHERE deleted_at IS NULL AND status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_conversations_unassigned
ON ai_support_agent.conversations(tenant_id)
WHERE assigned_agent_id IS NULL AND status = 'OPEN';

-- 4. Search Indexes (GIN index for fast full-text searches)
CREATE INDEX IF NOT EXISTS idx_messages_content_gin
ON ai_support_agent.messages USING gin(to_tsvector('english', coalesce(content, '')));

-- knowledge_documents has no body-text column (content lives chunked in
-- knowledge_chunks); title is the only free-text field on this table.
CREATE INDEX IF NOT EXISTS idx_kb_doc_title_content_gin
ON ai_support_agent.knowledge_documents USING gin(to_tsvector('english', coalesce(title, '')));

-- 5. Covering Indexes (INCLUDE payload columns to avoid database heap fetches)
CREATE INDEX IF NOT EXISTS idx_convs_covering 
ON ai_support_agent.conversations(tenant_id, id) 
INCLUDE (status, priority, subject);

-- 6. Analytics Aggregation Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_agg
ON ai_support_agent.analytics_events(tenant_id, event_name, created_at);
