CREATE TABLE "ai_support_agent"."workflow_templates" (
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
	"workflow_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_template_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"execution_status" varchar(50) DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"execution_time_ms" integer DEFAULT 0 NOT NULL,
	"trigger_source" varchar(50) NOT NULL,
	"trigger_reference_id" varchar(255),
	"context" jsonb NOT NULL,
	"result" jsonb,
	"error" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"trigger_id" uuid,
	"field" varchar(255) NOT NULL,
	"operator" varchar(50) NOT NULL,
	"value" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"configuration" jsonb NOT NULL,
	"sequence_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_execution_id" uuid NOT NULL,
	"approver_id" uuid NOT NULL,
	"approval_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"comments" text,
	"approved_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"cron_expression" varchar(100) NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid,
	"workflow_execution_id" uuid,
	"action" varchar(100) NOT NULL,
	"details" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."workflow_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"value" text
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_template_id_fk" FOREIGN KEY ("workflow_template_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_triggers" ADD CONSTRAINT "workflow_triggers_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_conditions" ADD CONSTRAINT "workflow_conditions_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_conditions" ADD CONSTRAINT "workflow_conditions_trigger_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "ai_support_agent"."workflow_triggers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_actions" ADD CONSTRAINT "workflow_actions_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_approvals" ADD CONSTRAINT "workflow_approvals_workflow_execution_id_fk" FOREIGN KEY ("workflow_execution_id") REFERENCES "ai_support_agent"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_schedules" ADD CONSTRAINT "workflow_schedules_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_audit_logs" ADD CONSTRAINT "workflow_audit_logs_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_audit_logs" ADD CONSTRAINT "workflow_audit_logs_workflow_execution_id_fk" FOREIGN KEY ("workflow_execution_id") REFERENCES "ai_support_agent"."workflow_executions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."workflow_variables" ADD CONSTRAINT "workflow_variables_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "ai_support_agent"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_wf_templates_tenant" ON "ai_support_agent"."workflow_templates" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_templates_status" ON "ai_support_agent"."workflow_templates" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "idx_wf_versions_template" ON "ai_support_agent"."workflow_versions" USING btree ("tenant_id","workflow_template_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_exec_tenant" ON "ai_support_agent"."workflow_executions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_exec_wf" ON "ai_support_agent"."workflow_executions" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_exec_status" ON "ai_support_agent"."workflow_executions" USING btree ("tenant_id","execution_status");
--> statement-breakpoint
CREATE INDEX "idx_wf_triggers_wf" ON "ai_support_agent"."workflow_triggers" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_cond_wf" ON "ai_support_agent"."workflow_conditions" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_actions_wf" ON "ai_support_agent"."workflow_actions" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_approvals_exec" ON "ai_support_agent"."workflow_approvals" USING btree ("tenant_id","workflow_execution_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_schedules_wf" ON "ai_support_agent"."workflow_schedules" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_audit_tenant" ON "ai_support_agent"."workflow_audit_logs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_audit_wf" ON "ai_support_agent"."workflow_audit_logs" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE INDEX "idx_wf_vars_wf" ON "ai_support_agent"."workflow_variables" USING btree ("tenant_id","workflow_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_wf_var" ON "ai_support_agent"."workflow_variables" USING btree ("tenant_id","workflow_id","name");
