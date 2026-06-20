CREATE TABLE "ai_support_agent"."inbox_activity_feed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"actor_id" uuid,
	"event_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"assigned_agent_id" uuid,
	"assigned_team_id" uuid,
	"assignment_type" varchar(50) NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"filter_definition" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"active_conversation_id" uuid
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_saved_views" (
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
	"filter_id" uuid NOT NULL,
	"sort_configuration" jsonb,
	"column_configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_snoozes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"snoozed_until" timestamp NOT NULL,
	"reason" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."inbox_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"customer_id" uuid,
	"channel_id" uuid,
	"assigned_agent_id" uuid,
	"assigned_team_id" uuid,
	"status" varchar(50) NOT NULL,
	"priority" varchar(50) DEFAULT 'MEDIUM' NOT NULL,
	"sentiment" varchar(50),
	"last_message" text,
	"last_message_at" timestamp,
	"last_message_type" varchar(50),
	"unread_count" integer DEFAULT 0 NOT NULL,
	"open_ticket_count" integer DEFAULT 0 NOT NULL,
	"ai_confidence_score" double precision,
	"waiting_since" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE INDEX "idx_inbox_activity_tenant" ON "ai_support_agent"."inbox_activity_feed" USING btree ("tenant_id");
CREATE INDEX "idx_inbox_activity_conv" ON "ai_support_agent"."inbox_activity_feed" USING btree ("tenant_id","conversation_id");
CREATE INDEX "idx_inbox_assignments_tenant" ON "ai_support_agent"."inbox_assignments" USING btree ("tenant_id");
CREATE INDEX "idx_inbox_assignments_conv" ON "ai_support_agent"."inbox_assignments" USING btree ("tenant_id","conversation_id");
CREATE INDEX "idx_inbox_bookmarks_tenant" ON "ai_support_agent"."inbox_bookmarks" USING btree ("tenant_id");
CREATE UNIQUE INDEX "uq_inbox_bookmarks_user_conv" ON "ai_support_agent"."inbox_bookmarks" USING btree ("tenant_id","user_id","conversation_id");
CREATE INDEX "idx_inbox_filters_tenant" ON "ai_support_agent"."inbox_filters" USING btree ("tenant_id");
CREATE INDEX "idx_inbox_presence_tenant" ON "ai_support_agent"."inbox_presence" USING btree ("tenant_id");
CREATE UNIQUE INDEX "uq_inbox_presence_user_tenant" ON "ai_support_agent"."inbox_presence" USING btree ("tenant_id","user_id");
CREATE INDEX "idx_inbox_saved_views_tenant" ON "ai_support_agent"."inbox_saved_views" USING btree ("tenant_id");
CREATE INDEX "idx_inbox_saved_views_user" ON "ai_support_agent"."inbox_saved_views" USING btree ("tenant_id","user_id");
CREATE INDEX "idx_inbox_snoozes_tenant" ON "ai_support_agent"."inbox_snoozes" USING btree ("tenant_id");
CREATE UNIQUE INDEX "uq_inbox_snoozes_conv_tenant" ON "ai_support_agent"."inbox_snoozes" USING btree ("tenant_id","conversation_id");
CREATE INDEX "idx_inbox_views_tenant" ON "ai_support_agent"."inbox_views" USING btree ("tenant_id");
CREATE UNIQUE INDEX "uq_inbox_views_conv_tenant" ON "ai_support_agent"."inbox_views" USING btree ("tenant_id","conversation_id");
CREATE INDEX "idx_inbox_views_status" ON "ai_support_agent"."inbox_views" USING btree ("tenant_id","status");
CREATE INDEX "idx_inbox_views_agent" ON "ai_support_agent"."inbox_views" USING btree ("tenant_id","assigned_agent_id");
CREATE INDEX "idx_inbox_views_team" ON "ai_support_agent"."inbox_views" USING btree ("tenant_id","assigned_team_id");
