CREATE SCHEMA "ai_support_agent";
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"details" text,
	"ip_address" varchar(45),
	"user_agent" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"feature" varchar(100) NOT NULL,
	"max_value" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tenant_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"metric" varchar(100) NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL
);
