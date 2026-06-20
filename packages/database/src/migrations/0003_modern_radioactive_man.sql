CREATE TABLE "ai_support_agent"."channel_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"channel_id" uuid NOT NULL,
	"authentication_type" varchar(50) NOT NULL,
	"configuration" jsonb NOT NULL,
	"credentials" jsonb NOT NULL,
	"settings" jsonb,
	"health_status" varchar(50) DEFAULT 'UNKNOWN' NOT NULL,
	"last_health_check" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."channel_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"channel_id" uuid NOT NULL,
	"provider_limit" integer DEFAULT 100 NOT NULL,
	"tenant_limit" integer DEFAULT 50 NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."channel_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"channel_id" uuid NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"template_content" text NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."channel_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"channel_id" uuid NOT NULL,
	"webhook_url" varchar(500) NOT NULL,
	"webhook_secret" varchar(255),
	"verification_token" varchar(255),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"last_received_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"provider" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."channel_configurations" ADD CONSTRAINT "channel_configurations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "ai_support_agent"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."channel_rate_limits" ADD CONSTRAINT "channel_rate_limits_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "ai_support_agent"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."channel_templates" ADD CONSTRAINT "channel_templates_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "ai_support_agent"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."channel_webhooks" ADD CONSTRAINT "channel_webhooks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "ai_support_agent"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_channel_config_tenant" ON "ai_support_agent"."channel_configurations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_channel_config_channel" ON "ai_support_agent"."channel_configurations" USING btree ("tenant_id","channel_id");--> statement-breakpoint
CREATE INDEX "idx_channel_rate_limits_tenant" ON "ai_support_agent"."channel_rate_limits" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_channel_rate_limits_channel" ON "ai_support_agent"."channel_rate_limits" USING btree ("tenant_id","channel_id");--> statement-breakpoint
CREATE INDEX "idx_channel_templates_tenant" ON "ai_support_agent"."channel_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_channel_templates_name" ON "ai_support_agent"."channel_templates" USING btree ("tenant_id","channel_id","template_name");--> statement-breakpoint
CREATE INDEX "idx_channel_webhooks_tenant" ON "ai_support_agent"."channel_webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_channel_webhooks_channel" ON "ai_support_agent"."channel_webhooks" USING btree ("tenant_id","channel_id");--> statement-breakpoint
CREATE INDEX "idx_channels_tenant" ON "ai_support_agent"."channels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_channels_type" ON "ai_support_agent"."channels" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_channels_tenant_name" ON "ai_support_agent"."channels" USING btree ("tenant_id","name");