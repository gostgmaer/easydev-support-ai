-- Adds the per-tenant secret used to verify HMAC-signed identified-visitor
-- requests (POST /v1/widget/auth/verify). Previously this "secret" was
-- derived entirely from publicly-readable config fields, making it forgeable
-- by any visitor - this column holds a real, randomly-generated value never
-- exposed via the public widget config endpoint.
ALTER TABLE ai_support_agent.widget_configs
ADD COLUMN IF NOT EXISTS identity_verification_secret text;
