CREATE TABLE "ai_support_agent"."connector_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"capability_type" varchar(60) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"method" varchar(10) DEFAULT 'GET' NOT NULL,
	"path" text NOT NULL,
	"request_mapping" jsonb,
	"response_mapping" jsonb,
	"input_schema" jsonb,
	"output_schema" jsonb,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connector_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"instance_id" uuid,
	"auth_type" varchar(50) DEFAULT 'NONE' NOT NULL,
	"encrypted_data" text NOT NULL,
	"key_id" varchar(100),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp,
	"rotated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connector_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"instance_id" uuid,
	"capability_id" uuid,
	"capability_type" varchar(60) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"status_code" integer,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"workflow_id" uuid,
	"conversation_id" uuid,
	"ticket_id" uuid,
	"idempotency_key" varchar(128),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connector_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"environment" varchar(50) DEFAULT 'production' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"health_status" varchar(50) DEFAULT 'UNKNOWN' NOT NULL,
	"config" jsonb,
	"last_health_check_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connector_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"instance_id" uuid,
	"execution_id" uuid,
	"level" varchar(20) DEFAULT 'INFO' NOT NULL,
	"message" text NOT NULL,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connector_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"instance_id" uuid,
	"window_seconds" integer DEFAULT 60 NOT NULL,
	"max_requests" integer DEFAULT 1000 NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connector_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"connector_id" uuid NOT NULL,
	"instance_id" uuid,
	"url" text NOT NULL,
	"secret" text,
	"signature_header" varchar(100) DEFAULT 'x-signature' NOT NULL,
	"events" jsonb,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"last_triggered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(300) NOT NULL,
	"connector_type" varchar(50) NOT NULL,
	"description" text,
	"base_url" text,
	"auth_type" varchar(50) DEFAULT 'NONE' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"health_status" varchar(50) DEFAULT 'UNKNOWN' NOT NULL,
	"openapi_spec" jsonb,
	"config" jsonb,
	"last_health_check_at" timestamp,
	"last_error" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_capabilities" ADD CONSTRAINT "connector_capabilities_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_credentials" ADD CONSTRAINT "connector_credentials_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_credentials" ADD CONSTRAINT "connector_credentials_instance_id_connector_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "ai_support_agent"."connector_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_executions" ADD CONSTRAINT "connector_executions_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_instances" ADD CONSTRAINT "connector_instances_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_logs" ADD CONSTRAINT "connector_logs_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_rate_limits" ADD CONSTRAINT "connector_rate_limits_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."connector_webhooks" ADD CONSTRAINT "connector_webhooks_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "ai_support_agent"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_connector_capabilities_tenant" ON "ai_support_agent"."connector_capabilities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_connector_capabilities_connector" ON "ai_support_agent"."connector_capabilities" USING btree ("tenant_id","connector_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_connector_capabilities_type" ON "ai_support_agent"."connector_capabilities" USING btree ("tenant_id","connector_id","capability_type");--> statement-breakpoint
CREATE INDEX "idx_connector_credentials_tenant" ON "ai_support_agent"."connector_credentials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_connector_credentials_connector" ON "ai_support_agent"."connector_credentials" USING btree ("tenant_id","connector_id","status");--> statement-breakpoint
CREATE INDEX "idx_connector_executions_tenant" ON "ai_support_agent"."connector_executions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_connector_executions_connector" ON "ai_support_agent"."connector_executions" USING btree ("tenant_id","connector_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_connector_executions_capability" ON "ai_support_agent"."connector_executions" USING btree ("tenant_id","capability_type");--> statement-breakpoint
CREATE INDEX "idx_connector_executions_idempotency" ON "ai_support_agent"."connector_executions" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_connector_instances_tenant" ON "ai_support_agent"."connector_instances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_connector_instances_connector" ON "ai_support_agent"."connector_instances" USING btree ("tenant_id","connector_id","status");--> statement-breakpoint
CREATE INDEX "idx_connector_logs_tenant" ON "ai_support_agent"."connector_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_connector_logs_connector" ON "ai_support_agent"."connector_logs" USING btree ("tenant_id","connector_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_connector_rate_limits_tenant" ON "ai_support_agent"."connector_rate_limits" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_connector_rate_limits_connector" ON "ai_support_agent"."connector_rate_limits" USING btree ("tenant_id","connector_id");--> statement-breakpoint
CREATE INDEX "idx_connector_webhooks_tenant" ON "ai_support_agent"."connector_webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_connector_webhooks_connector" ON "ai_support_agent"."connector_webhooks" USING btree ("tenant_id","connector_id");--> statement-breakpoint
CREATE INDEX "idx_connectors_tenant" ON "ai_support_agent"."connectors" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_connectors_slug" ON "ai_support_agent"."connectors" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_connectors_type" ON "ai_support_agent"."connectors" USING btree ("tenant_id","connector_type","status");--> statement-breakpoint
CREATE INDEX "idx_connectors_health" ON "ai_support_agent"."connectors" USING btree ("tenant_id","health_status");