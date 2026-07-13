CREATE INDEX "idx_audit_logs_tenant" ON "ai_support_agent"."audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_recent" ON "ai_support_agent"."audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "ai_support_agent"."audit_logs" USING btree ("tenant_id","action","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "ai_support_agent"."audit_logs" USING btree ("tenant_id","user_id","created_at");