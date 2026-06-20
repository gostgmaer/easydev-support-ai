CREATE TABLE "ai_support_agent"."conversation_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"agent_profile_id" uuid,
	"team_id" uuid,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"assignment_type" varchar(50) DEFAULT 'MANUAL' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."conversation_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"mentioned_user_id" uuid NOT NULL,
	"mentioned_by" uuid NOT NULL,
	"message_reference" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."conversation_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"note" text NOT NULL,
	"visibility" varchar(50) DEFAULT 'INTERNAL' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"participant_type" varchar(50) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."conversation_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"customer_name" varchar(255),
	"customer_avatar" varchar(500),
	"last_message" text,
	"last_message_type" varchar(50),
	"last_message_at" timestamp,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"total_attachments" integer DEFAULT 0 NOT NULL,
	"sentiment_score" double precision DEFAULT 0 NOT NULL,
	"priority" varchar(50),
	"status" varchar(50),
	"assigned_agent_name" varchar(255),
	"assigned_team_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."conversation_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"color" varchar(20),
	"is_system_tag" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel_id" uuid,
	"assigned_agent_id" uuid,
	"assigned_team_id" uuid,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"priority" varchar(50) DEFAULT 'MEDIUM' NOT NULL,
	"subject" varchar(500),
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"sentiment" varchar(20) DEFAULT 'NEUTRAL' NOT NULL,
	"source" varchar(50) DEFAULT 'API' NOT NULL,
	"last_message_at" timestamp,
	"last_activity_at" timestamp,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_assignments" ADD CONSTRAINT "conversation_assignments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_assignments" ADD CONSTRAINT "conversation_assignments_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "ai_support_agent"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_assignments" ADD CONSTRAINT "conversation_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_mentions" ADD CONSTRAINT "conversation_mentions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_notes" ADD CONSTRAINT "conversation_notes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_summary" ADD CONSTRAINT "conversation_summary_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversation_tags" ADD CONSTRAINT "conversation_tags_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversations" ADD CONSTRAINT "conversations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "ai_support_agent"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversations" ADD CONSTRAINT "conversations_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "ai_support_agent"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversations" ADD CONSTRAINT "conversations_assigned_agent_id_agent_profiles_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "ai_support_agent"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."conversations" ADD CONSTRAINT "conversations_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversation_assignments_tenant" ON "ai_support_agent"."conversation_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_assignments_conversation" ON "ai_support_agent"."conversation_assignments" USING btree ("tenant_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_assignments_agent" ON "ai_support_agent"."conversation_assignments" USING btree ("tenant_id","agent_profile_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_mentions_tenant" ON "ai_support_agent"."conversation_mentions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_mentions_user" ON "ai_support_agent"."conversation_mentions" USING btree ("tenant_id","mentioned_user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_mentions_conversation" ON "ai_support_agent"."conversation_mentions" USING btree ("tenant_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_notes_tenant" ON "ai_support_agent"."conversation_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_notes_conversation" ON "ai_support_agent"."conversation_notes" USING btree ("tenant_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants_tenant" ON "ai_support_agent"."conversation_participants" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversation_participants" ON "ai_support_agent"."conversation_participants" USING btree ("tenant_id","conversation_id","participant_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_summary_tenant" ON "ai_support_agent"."conversation_summary" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversation_summary_conversation" ON "ai_support_agent"."conversation_summary" USING btree ("tenant_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_summary_inbox" ON "ai_support_agent"."conversation_summary" USING btree ("tenant_id","status","priority","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_conversation_tags_tenant" ON "ai_support_agent"."conversation_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversation_tags" ON "ai_support_agent"."conversation_tags" USING btree ("tenant_id","conversation_id","tag");--> statement-breakpoint
CREATE INDEX "idx_conversation_tags_search" ON "ai_support_agent"."conversation_tags" USING btree ("tenant_id","tag");--> statement-breakpoint
CREATE INDEX "idx_conversations_tenant" ON "ai_support_agent"."conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_inbox" ON "ai_support_agent"."conversations" USING btree ("tenant_id","status","priority","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_agent" ON "ai_support_agent"."conversations" USING btree ("tenant_id","assigned_agent_id","status");--> statement-breakpoint
CREATE INDEX "idx_conversations_team" ON "ai_support_agent"."conversations" USING btree ("tenant_id","assigned_team_id","status");--> statement-breakpoint
CREATE INDEX "idx_conversations_customer" ON "ai_support_agent"."conversations" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_activity" ON "ai_support_agent"."conversations" USING btree ("tenant_id","last_activity_at");