-- Analytics Reports + Schedules
-- These tables are declared in packages/database/src/schema.ts (entries
-- 89/90) but were never created by any prior migration. This file adds
-- them and the indexes their Drizzle definitions declare, matching the
-- schema's `commonColumns` (id, tenantId, createdAt, updatedAt,
-- createdBy, updatedBy, deletedAt, version) plus the per-table columns.

CREATE TABLE IF NOT EXISTS ai_support_agent.analytics_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  version     integer NOT NULL DEFAULT 1,
  name        varchar(255) NOT NULL,
  description text,
  report_type varchar(50)  NOT NULL,
  time_range  varchar(50)  NOT NULL,
  filters     jsonb,
  parameters  jsonb,
  data        jsonb
);
CREATE INDEX IF NOT EXISTS idx_an_rep_tenant
  ON ai_support_agent.analytics_reports(tenant_id);

CREATE TABLE IF NOT EXISTS ai_support_agent.analytics_report_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_by      uuid,
  deleted_at      timestamptz,
  version         integer NOT NULL DEFAULT 1,
  report_id       uuid NOT NULL REFERENCES ai_support_agent.analytics_reports(id) ON DELETE CASCADE,
  name            varchar(255) NOT NULL,
  cron_expression varchar(50)  NOT NULL,
  timezone        varchar(50)  NOT NULL DEFAULT 'UTC',
  export_format   varchar(20)  NOT NULL,
  recipients      jsonb        NOT NULL,
  is_active       boolean      NOT NULL DEFAULT true,
  next_run_at     timestamptz,
  last_run_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_an_sched_tenant
  ON ai_support_agent.analytics_report_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_an_sched_rep
  ON ai_support_agent.analytics_report_schedules(tenant_id, report_id);
