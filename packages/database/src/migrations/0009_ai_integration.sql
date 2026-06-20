CREATE TABLE "ai_support_agent"."ai_agents" (
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
	"agent_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"default_workflow" varchar(255),
	"system_prompt_reference" text,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_agent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"agent_id" uuid NOT NULL,
	"knowledge_scope" jsonb,
	"connector_scope" jsonb,
	"language_support" jsonb,
	"escalation_rules" jsonb,
	"configuration" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_conversation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"workflow_execution_id" uuid,
	"session_state" jsonb,
	"last_interaction_at" timestamp,
	"context_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_id" varchar(255) NOT NULL,
	"conversation_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"execution_time_ms" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"estimated_cost" double precision DEFAULT 0.0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_tool_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"workflow_execution_id" uuid NOT NULL,
	"tool_name" varchar(255) NOT NULL,
	"capability" varchar(255) NOT NULL,
	"payload" jsonb,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_tool_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"tool_request_id" uuid NOT NULL,
	"response" jsonb,
	"status" varchar(50) DEFAULT 'SUCCESS' NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"confidence_score" double precision,
	"sentiment_score" double precision,
	"escalated_to" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_response_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"workflow_execution_id" uuid,
	"response_type" varchar(50) NOT NULL,
	"response_time_ms" integer DEFAULT 0 NOT NULL,
	"confidence_score" double precision,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0.0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_usage_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0.0 NOT NULL,
	"workflow_count" integer DEFAULT 0 NOT NULL,
	"tool_calls" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."ai_model_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"agent_id" uuid NOT NULL,
	"model_name" varchar(255) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"temperature" double precision DEFAULT 0.7 NOT NULL,
	"max_tokens" integer DEFAULT 2048 NOT NULL,
	"top_p" double precision DEFAULT 1.0 NOT NULL,
	"presence_penalty" double precision DEFAULT 0.0 NOT NULL,
	"frequency_penalty" double precision DEFAULT 0.0 NOT NULL,
	"stop_sequences" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_agent_profiles" ADD CONSTRAINT "ai_agent_profiles_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "ai_support_agent"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_conversation_sessions" ADD CONSTRAINT "ai_conversation_sessions_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "ai_support_agent"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_tool_requests" ADD CONSTRAINT "ai_tool_requests_workflow_execution_id_fk" FOREIGN KEY ("workflow_execution_id") REFERENCES "ai_support_agent"."ai_workflow_executions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_tool_results" ADD CONSTRAINT "ai_tool_results_tool_request_id_fk" FOREIGN KEY ("tool_request_id") REFERENCES "ai_support_agent"."ai_tool_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_response_logs" ADD CONSTRAINT "ai_response_logs_workflow_execution_id_fk" FOREIGN KEY ("workflow_execution_id") REFERENCES "ai_support_agent"."ai_workflow_executions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_usage_metrics" ADD CONSTRAINT "ai_usage_metrics_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "ai_support_agent"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ai_model_configurations" ADD CONSTRAINT "ai_model_configurations_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "ai_support_agent"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_ai_agents_tenant" ON "ai_support_agent"."ai_agents" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_agents_type" ON "ai_support_agent"."ai_agents" USING btree ("tenant_id","agent_type");
--> statement-breakpoint
CREATE INDEX "idx_ai_agent_profiles_tenant" ON "ai_support_agent"."ai_agent_profiles" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_agent_profiles_agent" ON "ai_support_agent"."ai_agent_profiles" USING btree ("tenant_id","agent_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_sessions_tenant" ON "ai_support_agent"."ai_conversation_sessions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ai_sessions_conv" ON "ai_support_agent"."ai_conversation_sessions" USING btree ("tenant_id","conversation_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_sessions_agent" ON "ai_support_agent"."ai_conversation_sessions" USING btree ("tenant_id","agent_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_workflows_tenant" ON "ai_support_agent"."ai_workflow_executions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_workflows_conv" ON "ai_support_agent"."ai_workflow_executions" USING btree ("tenant_id","conversation_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_workflows_status" ON "ai_support_agent"."ai_workflow_executions" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "idx_ai_tool_req_tenant" ON "ai_support_agent"."ai_tool_requests" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_tool_req_exec" ON "ai_support_agent"."ai_tool_requests" USING btree ("tenant_id","workflow_execution_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_tool_res_tenant" ON "ai_support_agent"."ai_tool_results" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_tool_res_req" ON "ai_support_agent"."ai_tool_results" USING btree ("tenant_id","tool_request_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_escalations_tenant" ON "ai_support_agent"."ai_escalations" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_escalations_conv" ON "ai_support_agent"."ai_escalations" USING btree ("tenant_id","conversation_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_escalations_status" ON "ai_support_agent"."ai_escalations" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "idx_ai_resp_logs_tenant" ON "ai_support_agent"."ai_response_logs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_resp_logs_conv" ON "ai_support_agent"."ai_response_logs" USING btree ("tenant_id","conversation_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_usage_tenant" ON "ai_support_agent"."ai_usage_metrics" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ai_usage_agent_date" ON "ai_support_agent"."ai_usage_metrics" USING btree ("tenant_id","agent_id","date");
--> statement-breakpoint
CREATE INDEX "idx_ai_model_config_tenant" ON "ai_support_agent"."ai_model_configurations" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_ai_model_config_agent" ON "ai_support_agent"."ai_model_configurations" USING btree ("tenant_id","agent_id");
