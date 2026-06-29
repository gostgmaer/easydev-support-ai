-- Migration 0017: Add SLA pause tracking columns
-- Adds `paused_at` and `paused_seconds` to ticket_sla to support
-- automatic SLA clock suspension while a ticket waits for customer
-- reply or manager approval, preventing unfair breach attribution.

ALTER TABLE support_agent.ticket_sla
  ADD COLUMN IF NOT EXISTS paused_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_seconds INTEGER NOT NULL DEFAULT 0;
