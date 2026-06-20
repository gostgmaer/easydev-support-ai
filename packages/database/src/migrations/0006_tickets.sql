CREATE TABLE "ai_support_agent"."ticket_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"approver_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"type" varchar(50) DEFAULT 'CUSTOM' NOT NULL,
	"comments" text,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"agent_id" uuid,
	"team_id" uuid,
	"assignment_type" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" uuid
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"comment_id" uuid,
	"file_name" varchar(500) NOT NULL,
	"file_type" varchar(100),
	"file_size" bigint,
	"file_url" varchar(1000),
	"checksum" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"comment" text NOT NULL,
	"visibility" varchar(50) DEFAULT 'PUBLIC' NOT NULL,
	"attachments_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_sla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"policy_id" uuid,
	"response_due_at" timestamp,
	"resolution_due_at" timestamp,
	"breached" boolean DEFAULT false NOT NULL,
	"breached_at" timestamp,
	"remaining_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"color" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ticket_watchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_preferences" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"customer_id" uuid,
	"conversation_id" uuid,
	"assigned_agent_id" uuid,
	"assigned_team_id" uuid,
	"category_id" uuid,
	"priority" varchar(50) DEFAULT 'MEDIUM' NOT NULL,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"source" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"subject" varchar(500) NOT NULL,
	"description" text,
	"resolution_summary" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_approvals" ADD CONSTRAINT "ticket_approvals_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_assignments" ADD CONSTRAINT "ticket_assignments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_assignments" ADD CONSTRAINT "ticket_assignments_agent_id_agent_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "ai_support_agent"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_assignments" ADD CONSTRAINT "ticket_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_attachments" ADD CONSTRAINT "ticket_attachments_comment_id_ticket_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "ai_support_agent"."ticket_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_sla" ADD CONSTRAINT "ticket_sla_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_tags" ADD CONSTRAINT "ticket_tags_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_watchers" ADD CONSTRAINT "ticket_watchers_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ai_support_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "ai_support_agent"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."tickets" ADD CONSTRAINT "tickets_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "ai_support_agent"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."tickets" ADD CONSTRAINT "tickets_assigned_agent_id_agent_profiles_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "ai_support_agent"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."tickets" ADD CONSTRAINT "tickets_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."tickets" ADD CONSTRAINT "tickets_category_id_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "ai_support_agent"."ticket_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ticket_approvals_tenant" ON "ai_support_agent"."ticket_approvals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_approvals_ticket" ON "ai_support_agent"."ticket_approvals" USING btree ("tenant_id","ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_approvals_approver" ON "ai_support_agent"."ticket_approvals" USING btree ("tenant_id","approver_id","status");--> statement-breakpoint
CREATE INDEX "idx_ticket_assignments_tenant" ON "ai_support_agent"."ticket_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_assignments_ticket" ON "ai_support_agent"."ticket_assignments" USING btree ("tenant_id","ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_assignments_agent" ON "ai_support_agent"."ticket_assignments" USING btree ("tenant_id","agent_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_attachments_tenant" ON "ai_support_agent"."ticket_attachments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_attachments_ticket" ON "ai_support_agent"."ticket_attachments" USING btree ("tenant_id","ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_attachments_comment" ON "ai_support_agent"."ticket_attachments" USING btree ("tenant_id","comment_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_categories_tenant" ON "ai_support_agent"."ticket_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ticket_categories_name" ON "ai_support_agent"."ticket_categories" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_ticket_comments_tenant" ON "ai_support_agent"."ticket_comments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_comments_ticket" ON "ai_support_agent"."ticket_comments" USING btree ("tenant_id","ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_sla_tenant" ON "ai_support_agent"."ticket_sla" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ticket_sla_ticket" ON "ai_support_agent"."ticket_sla" USING btree ("tenant_id","ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_sla_due" ON "ai_support_agent"."ticket_sla" USING btree ("tenant_id","breached","resolution_due_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_tags_tenant" ON "ai_support_agent"."ticket_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ticket_tags" ON "ai_support_agent"."ticket_tags" USING btree ("tenant_id","ticket_id","tag");--> statement-breakpoint
CREATE INDEX "idx_ticket_tags_search" ON "ai_support_agent"."ticket_tags" USING btree ("tenant_id","tag");--> statement-breakpoint
CREATE INDEX "idx_ticket_watchers_tenant" ON "ai_support_agent"."ticket_watchers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ticket_watchers" ON "ai_support_agent"."ticket_watchers" USING btree ("tenant_id","ticket_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant" ON "ai_support_agent"."tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tickets_number" ON "ai_support_agent"."tickets" USING btree ("tenant_id","ticket_number");--> statement-breakpoint
CREATE INDEX "idx_tickets_queue" ON "ai_support_agent"."tickets" USING btree ("tenant_id","status","priority","opened_at");--> statement-breakpoint
CREATE INDEX "idx_tickets_agent" ON "ai_support_agent"."tickets" USING btree ("tenant_id","assigned_agent_id","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_team" ON "ai_support_agent"."tickets" USING btree ("tenant_id","assigned_team_id","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_customer" ON "ai_support_agent"."tickets" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_category" ON "ai_support_agent"."tickets" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_conversation" ON "ai_support_agent"."tickets" USING btree ("tenant_id","conversation_id");