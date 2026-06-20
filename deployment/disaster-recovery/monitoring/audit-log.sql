-- Disaster Recovery Audit Logs Schema
CREATE SCHEMA IF NOT EXISTS ai_support_agent;

CREATE TABLE IF NOT EXISTS ai_support_agent.dr_audit_logs (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- 'BACKUP_CREATED', 'BACKUP_VERIFIED', 'RESTORE_STARTED', 'RESTORE_COMPLETED', 'RESTORE_FAILED', 'RECOVERY_EXECUTED'
    component VARCHAR(50) NOT NULL,   -- 'postgres', 'redis', 'tenant', 'deployment'
    target_identifier VARCHAR(255),   -- Backup filename, Tenant UUID, or Release Tag
    status VARCHAR(20) NOT NULL,       -- 'SUCCESS', 'FAILED', 'IN_PROGRESS'
    checksum VARCHAR(64),              -- SHA-256 integrity hash
    size_bytes BIGINT,                 -- Size of backup file in bytes
    metadata JSONB,                    -- Execution context, errors, runtime flags
    executed_by VARCHAR(100) NOT NULL, -- Script or IAM role executing the operation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dr_audit_logs_action ON ai_support_agent.dr_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_dr_audit_logs_component ON ai_support_agent.dr_audit_logs(component);
CREATE INDEX IF NOT EXISTS idx_dr_audit_logs_target ON ai_support_agent.dr_audit_logs(target_identifier);
