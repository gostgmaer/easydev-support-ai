CREATE TABLE "ai_support_agent"."analytics_agent_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"agent_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"assigned_conversations" integer DEFAULT 0 NOT NULL,
	"resolved_conversations" integer DEFAULT 0 NOT NULL,
	"assigned_tickets" integer DEFAULT 0 NOT NULL,
	"resolved_tickets" integer DEFAULT 0 NOT NULL,
	"average_response_time" numeric DEFAULT '0' NOT NULL,
	"average_resolution_time" numeric DEFAULT '0' NOT NULL,
	"csat_score" numeric DEFAULT '0' NOT NULL,
	"workload" integer DEFAULT 0 NOT NULL,
	"utilization" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_ai_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"timestamp" timestamp NOT NULL,
	"ai_requests" integer DEFAULT 0 NOT NULL,
	"tokens_used" bigint DEFAULT 0 NOT NULL,
	"prompt_tokens" bigint DEFAULT 0 NOT NULL,
	"completion_tokens" bigint DEFAULT 0 NOT NULL,
	"estimated_cost" numeric DEFAULT '0' NOT NULL,
	"response_time" numeric DEFAULT '0' NOT NULL,
	"escalation_rate" numeric DEFAULT '0' NOT NULL,
	"ai_resolution_rate" numeric DEFAULT '0' NOT NULL,
	"human_resolution_rate" numeric DEFAULT '0' NOT NULL,
	"workflow_executions" integer DEFAULT 0 NOT NULL,
	"tool_calls" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_channel_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"channel_id" uuid NOT NULL,
	"channel_type" varchar(50) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"response_time" numeric DEFAULT '0' NOT NULL,
	"delivery_success_rate" numeric DEFAULT '0' NOT NULL,
	"failure_rate" numeric DEFAULT '0' NOT NULL,
	"usage_volume" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_customer_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"lifetime_value" numeric DEFAULT '0' NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"ticket_count" integer DEFAULT 0 NOT NULL,
	"sentiment_score" numeric DEFAULT '0' NOT NULL,
	"retention_score" numeric DEFAULT '0' NOT NULL,
	"risk_score" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"metric_type" varchar(100) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"value" numeric NOT NULL,
	"dimensions" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"aggregate_type" varchar(100) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"user_id" uuid,
	"timestamp" timestamp NOT NULL,
	"payload" jsonb NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_hourly_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"metric_type" varchar(100) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"value" numeric NOT NULL,
	"dimensions" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_tenant_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"timestamp" timestamp NOT NULL,
	"conversations_count" integer DEFAULT 0 NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"tickets_count" integer DEFAULT 0 NOT NULL,
	"resolved_tickets_count" integer DEFAULT 0 NOT NULL,
	"average_response_time" numeric DEFAULT '0' NOT NULL,
	"average_resolution_time" numeric DEFAULT '0' NOT NULL,
	"csat_score" numeric DEFAULT '0' NOT NULL,
	"sla_violation_rate" numeric DEFAULT '0' NOT NULL,
	"estimated_cost_savings" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_ticket_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"timestamp" timestamp NOT NULL,
	"status" varchar(50) NOT NULL,
	"priority" varchar(50) NOT NULL,
	"ticket_count" integer DEFAULT 0 NOT NULL,
	"response_time" numeric DEFAULT '0' NOT NULL,
	"resolution_time" numeric DEFAULT '0' NOT NULL,
	"sla_violations_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."analytics_workflow_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"average_duration" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"default_agent" varchar(255),
	"confidence_threshold" double precision DEFAULT 0.7 NOT NULL,
	"escalation_threshold" double precision DEFAULT 0.4 NOT NULL,
	"allowed_languages" jsonb DEFAULT '[]' NOT NULL,
	"default_language" varchar(10) DEFAULT 'en' NOT NULL,
	"auto_response_enabled" boolean DEFAULT true NOT NULL,
	"auto_escalation_enabled" boolean DEFAULT true NOT NULL,
	"cost_limit_daily" numeric(10, 2),
	"cost_limit_monthly" numeric(10, 2),
	"model_configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"logo_url" varchar(500),
	"favicon_url" varchar(500),
	"primary_color" varchar(20) DEFAULT '#000000' NOT NULL,
	"secondary_color" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"theme_mode" varchar(20) DEFAULT 'LIGHT' NOT NULL,
	"email_header" text,
	"email_footer" text,
	"custom_css" text
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(8) DEFAULT '09:00:00' NOT NULL,
	"end_time" varchar(8) DEFAULT '17:00:00' NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_channel_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"channel_type" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"business_hours_only" boolean DEFAULT false NOT NULL,
	"auto_assignment_enabled" boolean DEFAULT true NOT NULL,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 100 NOT NULL,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"holiday_name" varchar(255) NOT NULL,
	"holiday_date" timestamp NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"country" varchar(50),
	"region" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"webhook_enabled" boolean DEFAULT false NOT NULL,
	"digest_enabled" boolean DEFAULT false NOT NULL,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"theme" varchar(50) DEFAULT 'light' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"auto_resolve_days" integer DEFAULT 3 NOT NULL,
	"auto_close_days" integer DEFAULT 7 NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_security_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"session_timeout" integer DEFAULT 3600 NOT NULL,
	"ip_whitelist" jsonb DEFAULT '[]' NOT NULL,
	"mfa_required" boolean DEFAULT false NOT NULL,
	"api_key_rotation_days" integer DEFAULT 90 NOT NULL,
	"audit_retention_days" integer DEFAULT 365 NOT NULL,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"tenant_name" varchar(255) NOT NULL,
	"industry" varchar(100),
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"country" varchar(50),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"support_email" varchar(255),
	"support_phone" varchar(50),
	"website_url" varchar(255),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_sla_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"response_time_target" integer DEFAULT 3600 NOT NULL,
	"resolution_time_target" integer DEFAULT 86400 NOT NULL,
	"escalation_time_target" integer DEFAULT 14400 NOT NULL,
	"business_hours_only" boolean DEFAULT true NOT NULL,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_usage_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"max_agents" integer DEFAULT 5 NOT NULL,
	"max_conversations" integer DEFAULT 1000 NOT NULL,
	"max_messages" integer DEFAULT 10000 NOT NULL,
	"max_workflows" integer DEFAULT 10 NOT NULL,
	"max_connectors" integer DEFAULT 5 NOT NULL,
	"max_documents" integer DEFAULT 100 NOT NULL,
	"max_storage" bigint DEFAULT 1073741824 NOT NULL,
	"max_ai_requests" integer DEFAULT 5000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_widget_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"widget_name" varchar(255) DEFAULT 'Live Support' NOT NULL,
	"widget_color" varchar(20) DEFAULT '#1A73E8' NOT NULL,
	"widget_position" varchar(50) DEFAULT 'BOTTOM_RIGHT' NOT NULL,
	"welcome_message" text,
	"offline_message" text,
	"avatar_url" varchar(500),
	"custom_css" text,
	"custom_js" text
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"visitor_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"widget_name" varchar(255) NOT NULL,
	"theme" varchar(50) DEFAULT 'light' NOT NULL,
	"primary_color" varchar(20) DEFAULT '#000000' NOT NULL,
	"secondary_color" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"position" varchar(20) DEFAULT 'bottom-right' NOT NULL,
	"welcome_message" text,
	"offline_message" text,
	"avatar_url" varchar(500),
	"custom_css" text,
	"custom_js" text,
	"allowed_domains" jsonb DEFAULT '[]' NOT NULL,
	"identity_verification_secret" text
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"widget_session_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"session_id" uuid NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"event_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"visitor_id" uuid NOT NULL,
	"external_user_id" varchar(255) NOT NULL,
	"verification_method" varchar(50) NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"domain" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"verification_token" varchar(255) NOT NULL,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"company" varchar(255),
	"source" varchar(100) NOT NULL,
	"lead_score" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'NEW' NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"session_id" uuid NOT NULL,
	"url" varchar(2048) NOT NULL,
	"title" varchar(500),
	"time_spent_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"visitor_id" uuid NOT NULL,
	"session_token" varchar(500) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"ip_address_hash" varchar(64),
	"user_agent" varchar(500),
	"device_type" varchar(50),
	"browser" varchar(50),
	"os" varchar(50),
	"referrer" varchar(1024),
	"landing_page" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."widget_visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"anonymous_id" varchar(255) NOT NULL,
	"customer_id" uuid,
	"email" varchar(255),
	"phone" varchar(50),
	"name" varchar(255),
	"country" varchar(100),
	"city" varchar(100),
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_an_agent_m_tenant" ON "ai_support_agent"."analytics_agent_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_agent_m_agent" ON "ai_support_agent"."analytics_agent_metrics" USING btree ("tenant_id","agent_id");
--> statement-breakpoint
CREATE INDEX "idx_an_agent_m_ts" ON "ai_support_agent"."analytics_agent_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_ai_m_tenant" ON "ai_support_agent"."analytics_ai_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_ai_m_ts" ON "ai_support_agent"."analytics_ai_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_channel_m_tenant" ON "ai_support_agent"."analytics_channel_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_channel_m_chan" ON "ai_support_agent"."analytics_channel_metrics" USING btree ("tenant_id","channel_id");
--> statement-breakpoint
CREATE INDEX "idx_an_channel_m_ts" ON "ai_support_agent"."analytics_channel_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_cust_m_tenant" ON "ai_support_agent"."analytics_customer_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_cust_m_cust" ON "ai_support_agent"."analytics_customer_metrics" USING btree ("tenant_id","customer_id");
--> statement-breakpoint
CREATE INDEX "idx_an_cust_m_ts" ON "ai_support_agent"."analytics_customer_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_daily_tenant" ON "ai_support_agent"."analytics_daily_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_daily_metric" ON "ai_support_agent"."analytics_daily_metrics" USING btree ("tenant_id","metric_type");
--> statement-breakpoint
CREATE INDEX "idx_an_daily_ts" ON "ai_support_agent"."analytics_daily_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_ev_tenant" ON "ai_support_agent"."analytics_events" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_ev_name" ON "ai_support_agent"."analytics_events" USING btree ("tenant_id","event_name");
--> statement-breakpoint
CREATE INDEX "idx_an_ev_ts" ON "ai_support_agent"."analytics_events" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_hourly_tenant" ON "ai_support_agent"."analytics_hourly_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_hourly_metric" ON "ai_support_agent"."analytics_hourly_metrics" USING btree ("tenant_id","metric_type");
--> statement-breakpoint
CREATE INDEX "idx_an_hourly_ts" ON "ai_support_agent"."analytics_hourly_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_tenant_m_tenant" ON "ai_support_agent"."analytics_tenant_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_tenant_m_ts" ON "ai_support_agent"."analytics_tenant_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_ticket_m_tenant" ON "ai_support_agent"."analytics_ticket_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_ticket_m_ts" ON "ai_support_agent"."analytics_ticket_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_an_wf_m_tenant" ON "ai_support_agent"."analytics_workflow_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_an_wf_m_wf" ON "ai_support_agent"."analytics_workflow_metrics" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_an_wf_m_ts" ON "ai_support_agent"."analytics_workflow_metrics" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "idx_outbox_tenant" ON "ai_support_agent"."outbox_events" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_outbox_status" ON "ai_support_agent"."outbox_events" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "idx_tenant_ai_settings_tenant" ON "ai_support_agent"."tenant_ai_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_branding_tenant" ON "ai_support_agent"."tenant_branding" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_bus_hours_tenant" ON "ai_support_agent"."tenant_business_hours" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_bus_hours_day" ON "ai_support_agent"."tenant_business_hours" USING btree ("tenant_id","day_of_week");
--> statement-breakpoint
CREATE INDEX "idx_tenant_chan_settings_tenant" ON "ai_support_agent"."tenant_channel_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_chan_settings_type" ON "ai_support_agent"."tenant_channel_settings" USING btree ("tenant_id","channel_type");
--> statement-breakpoint
CREATE INDEX "idx_tenant_feat_flags_tenant" ON "ai_support_agent"."tenant_feature_flags" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_feat_flags_key" ON "ai_support_agent"."tenant_feature_flags" USING btree ("tenant_id","feature_key");
--> statement-breakpoint
CREATE INDEX "idx_tenant_holidays_tenant" ON "ai_support_agent"."tenant_holidays" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_holidays_date" ON "ai_support_agent"."tenant_holidays" USING btree ("tenant_id","holiday_date");
--> statement-breakpoint
CREATE INDEX "idx_tenant_notif_settings_tenant" ON "ai_support_agent"."tenant_notification_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_preferences_tenant" ON "ai_support_agent"."tenant_preferences" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_sec_settings_tenant" ON "ai_support_agent"."tenant_security_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_settings_tenant" ON "ai_support_agent"."tenant_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_sla_settings_tenant" ON "ai_support_agent"."tenant_sla_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_usage_limits_tenant" ON "ai_support_agent"."tenant_usage_limits" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_widget_settings_tenant" ON "ai_support_agent"."tenant_widget_settings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_tokens_tenant" ON "ai_support_agent"."widget_auth_tokens" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_tokens_visitor" ON "ai_support_agent"."widget_auth_tokens" USING btree ("visitor_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_widget_tokens_hash" ON "ai_support_agent"."widget_auth_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "idx_widget_configs_tenant" ON "ai_support_agent"."widget_configs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_convs_tenant" ON "ai_support_agent"."widget_conversations" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_convs_session" ON "ai_support_agent"."widget_conversations" USING btree ("widget_session_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_convs_conv" ON "ai_support_agent"."widget_conversations" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_events_tenant" ON "ai_support_agent"."widget_events" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_events_session" ON "ai_support_agent"."widget_events" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_identities_tenant" ON "ai_support_agent"."widget_identities" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_identities_visitor" ON "ai_support_agent"."widget_identities" USING btree ("visitor_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_widget_identities_ext" ON "ai_support_agent"."widget_identities" USING btree ("tenant_id","visitor_id","external_user_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_installs_tenant" ON "ai_support_agent"."widget_installations" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_widget_installs_domain" ON "ai_support_agent"."widget_installations" USING btree ("tenant_id","domain");
--> statement-breakpoint
CREATE INDEX "idx_widget_leads_tenant" ON "ai_support_agent"."widget_leads" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_leads_email" ON "ai_support_agent"."widget_leads" USING btree ("tenant_id","email");
--> statement-breakpoint
CREATE INDEX "idx_widget_pvs_tenant" ON "ai_support_agent"."widget_page_views" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_pvs_session" ON "ai_support_agent"."widget_page_views" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_sessions_tenant" ON "ai_support_agent"."widget_sessions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_sessions_visitor" ON "ai_support_agent"."widget_sessions" USING btree ("visitor_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_widget_sessions_token" ON "ai_support_agent"."widget_sessions" USING btree ("tenant_id","session_token");
--> statement-breakpoint
CREATE INDEX "idx_widget_visitors_tenant" ON "ai_support_agent"."widget_visitors" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_widget_visitors_anon" ON "ai_support_agent"."widget_visitors" USING btree ("tenant_id","anonymous_id");
--> statement-breakpoint
CREATE INDEX "idx_widget_visitors_email" ON "ai_support_agent"."widget_visitors" USING btree ("tenant_id","email");
--> statement-breakpoint
CREATE INDEX "idx_widget_visitors_cust" ON "ai_support_agent"."widget_visitors" USING btree ("tenant_id","customer_id");
