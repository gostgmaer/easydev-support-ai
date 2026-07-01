ALTER TABLE "ai_support_agent"."ticket_sla" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_support_agent"."ticket_sla" ADD COLUMN "paused_seconds" integer DEFAULT 0 NOT NULL;
