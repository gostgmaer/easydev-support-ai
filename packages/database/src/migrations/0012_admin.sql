CREATE TABLE "ai_support_agent"."admin_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"severity" varchar(20) DEFAULT 'INFO' NOT NULL,
	"audience" varchar(50) DEFAULT 'ALL' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"revoked_at" timestamp,
	"usage_count" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_audit_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filter_definition" jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"dashboard_name" varchar(255) NOT NULL,
	"layout" jsonb,
	"widgets" jsonb,
	"default_view" boolean DEFAULT false NOT NULL,
	"permissions" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_feature_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"feature_key" varchar(150) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"plan" varchar(50),
	"granted_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_operational_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(255) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"affected_service" varchar(100) NOT NULL,
	"description" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_system_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"latency_ms" integer,
	"error_rate" double precision,
	"last_check_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_tenant_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"feature_key" varchar(150) NOT NULL,
	"override_value" jsonb NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"secret_encrypted" text NOT NULL,
	"events" jsonb NOT NULL,
	"retry_policy" jsonb,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_delivery_at" timestamp,
	"last_delivery_status" varchar(20),
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."admin_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"widget_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" jsonb,
	"configuration" jsonb,
	"refresh_interval_seconds" integer DEFAULT 60 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_admin_announcements_tenant" ON "ai_support_agent"."admin_announcements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_admin_announcements_active" ON "ai_support_agent"."admin_announcements" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_admin_api_keys_tenant" ON "ai_support_agent"."admin_api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_admin_api_keys_hash" ON "ai_support_agent"."admin_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_admin_api_keys_status" ON "ai_support_agent"."admin_api_keys" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_views_tenant" ON "ai_support_agent"."admin_audit_views" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_views_user" ON "ai_support_agent"."admin_audit_views" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_admin_dashboards_tenant" ON "ai_support_agent"."admin_dashboards" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_admin_dashboards_tenant_name" ON "ai_support_agent"."admin_dashboards" USING btree ("tenant_id","dashboard_name");--> statement-breakpoint
CREATE INDEX "idx_admin_feature_access_tenant" ON "ai_support_agent"."admin_feature_access" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_admin_feature_access_tenant_key" ON "ai_support_agent"."admin_feature_access" USING btree ("tenant_id","feature_key");--> statement-breakpoint
CREATE INDEX "idx_admin_incidents_tenant" ON "ai_support_agent"."admin_operational_incidents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_admin_incidents_status" ON "ai_support_agent"."admin_operational_incidents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_admin_incidents_severity" ON "ai_support_agent"."admin_operational_incidents" USING btree ("tenant_id","severity");--> statement-breakpoint
CREATE INDEX "idx_admin_system_health_tenant" ON "ai_support_agent"."admin_system_health" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_admin_system_health_tenant_service" ON "ai_support_agent"."admin_system_health" USING btree ("tenant_id","service_name");--> statement-breakpoint
CREATE INDEX "idx_admin_tenant_overrides_tenant" ON "ai_support_agent"."admin_tenant_overrides" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_admin_tenant_overrides_tenant_key" ON "ai_support_agent"."admin_tenant_overrides" USING btree ("tenant_id","feature_key");--> statement-breakpoint
CREATE INDEX "idx_admin_webhooks_tenant" ON "ai_support_agent"."admin_webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_admin_webhooks_status" ON "ai_support_agent"."admin_webhooks" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_admin_widgets_tenant" ON "ai_support_agent"."admin_widgets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_admin_widgets_dashboard" ON "ai_support_agent"."admin_widgets" USING btree ("tenant_id","dashboard_id");--> statement-breakpoint
