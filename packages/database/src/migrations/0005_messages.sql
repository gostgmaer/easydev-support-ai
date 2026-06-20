CREATE TABLE "ai_support_agent"."message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"message_id" uuid NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_type" varchar(100),
	"file_size" bigint,
	"storage_provider" varchar(100),
	"storage_path" varchar(1000),
	"public_url" varchar(1000),
	"checksum" varchar(255),
	"thumbnail_url" varchar(1000),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."message_delivery_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"message_id" uuid NOT NULL,
	"provider" varchar(100),
	"provider_message_id" varchar(255),
	"status" varchar(50) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."message_drafts" (
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
	"draft_content" text NOT NULL,
	"draft_type" varchar(50) DEFAULT 'TEXT' NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."message_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"message_id" uuid NOT NULL,
	"mentioned_user_id" uuid NOT NULL,
	"mentioned_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"channel_type" varchar(50),
	"category" varchar(100),
	"content" text NOT NULL,
	"content_html" text,
	"variables" jsonb,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"channel_id" uuid,
	"customer_id" uuid,
	"sender_id" uuid,
	"sender_type" varchar(50) NOT NULL,
	"message_type" varchar(50) DEFAULT 'TEXT' NOT NULL,
	"direction" varchar(20) NOT NULL,
	"content" text,
	"content_html" text,
	"status" varchar(50) DEFAULT 'QUEUED' NOT NULL,
	"external_message_id" varchar(255),
	"reply_to_message_id" uuid,
	"thread_id" uuid,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "ai_support_agent"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."message_delivery_status" ADD CONSTRAINT "message_delivery_status_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "ai_support_agent"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."message_drafts" ADD CONSTRAINT "message_drafts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."message_mentions" ADD CONSTRAINT "message_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "ai_support_agent"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "ai_support_agent"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "ai_support_agent"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."messages" ADD CONSTRAINT "messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "ai_support_agent"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_message_attachments_tenant" ON "ai_support_agent"."message_attachments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_message_attachments_message" ON "ai_support_agent"."message_attachments" USING btree ("tenant_id","message_id");--> statement-breakpoint
CREATE INDEX "idx_message_attachments_checksum" ON "ai_support_agent"."message_attachments" USING btree ("tenant_id","checksum");--> statement-breakpoint
CREATE INDEX "idx_message_delivery_tenant" ON "ai_support_agent"."message_delivery_status" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_message_delivery_message" ON "ai_support_agent"."message_delivery_status" USING btree ("tenant_id","message_id");--> statement-breakpoint
CREATE INDEX "idx_message_delivery_provider_msg" ON "ai_support_agent"."message_delivery_status" USING btree ("tenant_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "idx_message_drafts_tenant" ON "ai_support_agent"."message_drafts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_message_drafts" ON "ai_support_agent"."message_drafts" USING btree ("tenant_id","conversation_id","author_id");--> statement-breakpoint
CREATE INDEX "idx_message_drafts_expires" ON "ai_support_agent"."message_drafts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_message_mentions_tenant" ON "ai_support_agent"."message_mentions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_message_mentions_message" ON "ai_support_agent"."message_mentions" USING btree ("tenant_id","message_id");--> statement-breakpoint
CREATE INDEX "idx_message_mentions_user" ON "ai_support_agent"."message_mentions" USING btree ("tenant_id","mentioned_user_id");--> statement-breakpoint
CREATE INDEX "idx_message_reactions_tenant" ON "ai_support_agent"."message_reactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_message_reactions_message" ON "ai_support_agent"."message_reactions" USING btree ("tenant_id","message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_message_reactions" ON "ai_support_agent"."message_reactions" USING btree ("tenant_id","message_id","user_id","reaction");--> statement-breakpoint
CREATE INDEX "idx_message_templates_tenant" ON "ai_support_agent"."message_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_message_templates_name" ON "ai_support_agent"."message_templates" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_message_templates_category" ON "ai_support_agent"."message_templates" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_messages_tenant" ON "ai_support_agent"."messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "ai_support_agent"."messages" USING btree ("tenant_id","conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_thread" ON "ai_support_agent"."messages" USING btree ("tenant_id","thread_id");--> statement-breakpoint
CREATE INDEX "idx_messages_status" ON "ai_support_agent"."messages" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_messages_direction" ON "ai_support_agent"."messages" USING btree ("tenant_id","conversation_id","direction");--> statement-breakpoint
CREATE INDEX "idx_messages_customer" ON "ai_support_agent"."messages" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_messages_channel" ON "ai_support_agent"."messages" USING btree ("tenant_id","channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_messages_external" ON "ai_support_agent"."messages" USING btree ("tenant_id","channel_id","external_message_id");