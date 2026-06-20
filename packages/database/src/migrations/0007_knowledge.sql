CREATE TABLE "ai_support_agent"."knowledge_categories" (
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
	"parent_category_id" uuid,
	"color" varchar(20),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_hash" varchar(128) NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"external_ref" varchar(255),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"doc_version" integer DEFAULT 1 NOT NULL,
	"source_id" uuid NOT NULL,
	"category_id" uuid,
	"title" varchar(500) NOT NULL,
	"slug" varchar(600) NOT NULL,
	"document_type" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"language" varchar(16) DEFAULT 'en' NOT NULL,
	"sync_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"ingestion_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"embedding_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"external_ref" varchar(255),
	"source_uri" text,
	"content_hash" varchar(128),
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"file_url" text,
	"storage_provider" varchar(100),
	"file_size" bigint,
	"mime_type" varchar(255),
	"checksum" varchar(128),
	"tags" jsonb,
	"published_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"document_id" uuid NOT NULL,
	"team_id" uuid,
	"role" varchar(100),
	"access_level" varchar(50) DEFAULT 'READ' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_search_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid,
	"query" text NOT NULL,
	"filters" jsonb,
	"results_count" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"source" varchar(50) DEFAULT 'API' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_sources" (
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
	"source_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"sync_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"uri" text,
	"connector_id" uuid,
	"config" jsonb,
	"document_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp,
	"last_error" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"source_id" uuid NOT NULL,
	"document_id" uuid,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"error" text,
	"stats" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"color" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "ai_support_agent"."knowledge_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"change_summary" text,
	"content_hash" varchar(128),
	"snapshot" jsonb,
	"published_by" uuid,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "ai_support_agent"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_documents" ADD CONSTRAINT "knowledge_documents_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "ai_support_agent"."knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_documents" ADD CONSTRAINT "knowledge_documents_category_id_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "ai_support_agent"."knowledge_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_permissions" ADD CONSTRAINT "knowledge_permissions_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "ai_support_agent"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_permissions" ADD CONSTRAINT "knowledge_permissions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "ai_support_agent"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_sync_jobs" ADD CONSTRAINT "knowledge_sync_jobs_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "ai_support_agent"."knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_sync_jobs" ADD CONSTRAINT "knowledge_sync_jobs_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "ai_support_agent"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."knowledge_versions" ADD CONSTRAINT "knowledge_versions_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "ai_support_agent"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_knowledge_categories_tenant" ON "ai_support_agent"."knowledge_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_categories_name" ON "ai_support_agent"."knowledge_categories" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_knowledge_categories_parent" ON "ai_support_agent"."knowledge_categories" USING btree ("tenant_id","parent_category_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_chunks_tenant" ON "ai_support_agent"."knowledge_chunks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_chunks_document" ON "ai_support_agent"."knowledge_chunks" USING btree ("tenant_id","document_id","chunk_index");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_chunks_index" ON "ai_support_agent"."knowledge_chunks" USING btree ("tenant_id","document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_tenant" ON "ai_support_agent"."knowledge_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_documents_slug" ON "ai_support_agent"."knowledge_documents" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_source" ON "ai_support_agent"."knowledge_documents" USING btree ("tenant_id","source_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_status" ON "ai_support_agent"."knowledge_documents" USING btree ("tenant_id","status","language");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_category" ON "ai_support_agent"."knowledge_documents" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_sync" ON "ai_support_agent"."knowledge_documents" USING btree ("tenant_id","sync_status");--> statement-breakpoint
CREATE INDEX "idx_knowledge_permissions_tenant" ON "ai_support_agent"."knowledge_permissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_permissions_document" ON "ai_support_agent"."knowledge_permissions" USING btree ("tenant_id","document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_permissions_grant" ON "ai_support_agent"."knowledge_permissions" USING btree ("tenant_id","document_id","team_id","role");--> statement-breakpoint
CREATE INDEX "idx_knowledge_search_logs_tenant" ON "ai_support_agent"."knowledge_search_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_search_logs_created" ON "ai_support_agent"."knowledge_search_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sources_tenant" ON "ai_support_agent"."knowledge_sources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sources_type" ON "ai_support_agent"."knowledge_sources" USING btree ("tenant_id","source_type","status");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sources_sync" ON "ai_support_agent"."knowledge_sources" USING btree ("tenant_id","sync_status");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sources_connector" ON "ai_support_agent"."knowledge_sources" USING btree ("tenant_id","connector_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sync_jobs_tenant" ON "ai_support_agent"."knowledge_sync_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sync_jobs_source" ON "ai_support_agent"."knowledge_sync_jobs" USING btree ("tenant_id","source_id","status");--> statement-breakpoint
CREATE INDEX "idx_knowledge_sync_jobs_status" ON "ai_support_agent"."knowledge_sync_jobs" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_knowledge_tags_tenant" ON "ai_support_agent"."knowledge_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_tags_name" ON "ai_support_agent"."knowledge_tags" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_knowledge_versions_tenant" ON "ai_support_agent"."knowledge_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_versions_document" ON "ai_support_agent"."knowledge_versions" USING btree ("tenant_id","document_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_versions_number" ON "ai_support_agent"."knowledge_versions" USING btree ("tenant_id","document_id","version_number");