CREATE TABLE "ai_support_agent"."customer_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid NOT NULL,
	"total_conversations" integer DEFAULT 0 NOT NULL,
	"total_tickets" integer DEFAULT 0 NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spend" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"average_csat" double precision DEFAULT 0 NOT NULL,
	"average_response_time" integer DEFAULT 0 NOT NULL,
	"average_resolution_time" integer DEFAULT 0 NOT NULL,
	"sentiment_score" double precision DEFAULT 0 NOT NULL,
	"lifetime_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"risk_score" double precision DEFAULT 0 NOT NULL,
	"vip_status" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"display_name" varchar(200),
	"avatar_url" varchar(500),
	"company" varchar(255),
	"job_title" varchar(255),
	"country" varchar(100),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"tags" jsonb,
	"custom_attributes" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."customer_segment_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"segment_name" varchar(255) NOT NULL,
	"segment_type" varchar(50) NOT NULL,
	"rules" jsonb,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"external_customer_id" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"preferred_language" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"last_seen_at" timestamp,
	"source" varchar(50) DEFAULT 'API' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."customer_metrics" ADD CONSTRAINT "customer_metrics_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "ai_support_agent"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."customer_profiles" ADD CONSTRAINT "customer_profiles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "ai_support_agent"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."customer_segment_members" ADD CONSTRAINT "customer_segment_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "ai_support_agent"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."customer_segment_members" ADD CONSTRAINT "customer_segment_members_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "ai_support_agent"."customer_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customer_metrics_tenant" ON "ai_support_agent"."customer_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customer_metrics_customer" ON "ai_support_agent"."customer_metrics" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_profiles_tenant" ON "ai_support_agent"."customer_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_customer_profiles_customer" ON "ai_support_agent"."customer_profiles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_profiles_search" ON "ai_support_agent"."customer_profiles" USING btree ("tenant_id","first_name","last_name","display_name");--> statement-breakpoint
CREATE INDEX "idx_customer_segment_members_tenant" ON "ai_support_agent"."customer_segment_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customer_segment_members" ON "ai_support_agent"."customer_segment_members" USING btree ("tenant_id","customer_id","segment_id");--> statement-breakpoint
CREATE INDEX "idx_customer_segments_tenant" ON "ai_support_agent"."customer_segments" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customer_segments_tenant_name" ON "ai_support_agent"."customer_segments" USING btree ("tenant_id","segment_name");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant" ON "ai_support_agent"."customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_tenant_email" ON "ai_support_agent"."customers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_tenant_ext_id" ON "ai_support_agent"."customers" USING btree ("tenant_id","external_customer_id");--> statement-breakpoint
CREATE INDEX "idx_customers_search" ON "ai_support_agent"."customers" USING btree ("tenant_id","status","email");