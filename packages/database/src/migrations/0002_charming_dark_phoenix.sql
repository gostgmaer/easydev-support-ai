CREATE TABLE "ai_support_agent"."agent_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"agent_profile_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'OFFLINE' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"working_hours" jsonb,
	"current_load" integer DEFAULT 0 NOT NULL,
	"active_conversations" integer DEFAULT 0 NOT NULL,
	"active_tickets" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."agent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_code" varchar(100),
	"display_name" varchar(200) NOT NULL,
	"avatar_url" varchar(500),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"capacity" integer DEFAULT 10 NOT NULL,
	"max_concurrent_conversations" integer DEFAULT 5 NOT NULL,
	"max_open_tickets" integer DEFAULT 20 NOT NULL,
	"skill_score" double precision DEFAULT 0 NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"language_preferences" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."assignment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"team_id" uuid NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"configuration" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"team_id" uuid NOT NULL,
	"agent_profile_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."teams" (
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
	"department" varchar(100),
	"priority" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."agent_availability" ADD CONSTRAINT "agent_availability_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "ai_support_agent"."agent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."assignment_rules" ADD CONSTRAINT "assignment_rules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."team_members" ADD CONSTRAINT "team_members_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "ai_support_agent"."agent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_availability_tenant" ON "ai_support_agent"."agent_availability" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agent_availability_profile" ON "ai_support_agent"."agent_availability" USING btree ("tenant_id","agent_profile_id");--> statement-breakpoint
CREATE INDEX "idx_agent_profiles_tenant" ON "ai_support_agent"."agent_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agent_profiles_tenant_user" ON "ai_support_agent"."agent_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agent_profiles_tenant_emp_code" ON "ai_support_agent"."agent_profiles" USING btree ("tenant_id","employee_code");--> statement-breakpoint
CREATE INDEX "idx_assignment_rules_tenant" ON "ai_support_agent"."assignment_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_rule_type" ON "ai_support_agent"."assignment_rules" USING btree ("tenant_id","team_id","rule_type");--> statement-breakpoint
CREATE INDEX "idx_team_members_tenant" ON "ai_support_agent"."team_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_members" ON "ai_support_agent"."team_members" USING btree ("tenant_id","team_id","agent_profile_id");--> statement-breakpoint
CREATE INDEX "idx_teams_tenant" ON "ai_support_agent"."teams" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_teams_tenant_name" ON "ai_support_agent"."teams" USING btree ("tenant_id","name");