#!/usr/bin/env bash
# --- EasyDev Support AI Automated DR Failover Manager ---
set -euo pipefail

DB_CONTAINER="support-ai-postgres"
REDIS_CONTAINER="support-ai-redis"
API_CONTAINER="support-ai-api"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
DB_PASSWORD=${DB_PASSWORD:-"prod_db_pass_extremely_secure_991823"}

export PGPASSWORD="${DB_PASSWORD}"

# Helper function to write audit log in postgres database
log_audit() {
    local action=$1
    local status=$2
    local target=$3
    local metadata=$4

    local sql="INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, executed_by, metadata) VALUES ('${action}', 'disaster_recovery', '${target}', '${status}', 'dr-failover.sh', '${metadata}');"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "${sql}" || true
    fi
}

echo "[DR-FAILOVER] Beginning disaster recovery scan..."

# 1. Database Health Check
DB_STATUS="UP"
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    if ! docker exec -i "${DB_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" &>/dev/null; then
        DB_STATUS="DOWN"
    fi
else
    DB_STATUS="DOWN"
fi

if [ "${DB_STATUS}" = "DOWN" ]; then
    echo "[DR-FAILOVER] [CRITICAL] PostgreSQL database is offline! Attempting replica failover..."
    log_audit "RECOVERY_EXECUTED" "IN_PROGRESS" "postgres_failover" "{\"reason\":\"database_offline\"}"
    
    # Simulate Replica Promotion
    # In replication configurations, we promote the read replica:
    # docker exec replica-container psql -U root -c "SELECT pg_promote();"
    # Or start backup DB
    
    # Attempt container recovery restart first
    echo "[DR-FAILOVER] Attempting Postgres service restart..."
    docker restart "${DB_CONTAINER}" || true
    sleep 5
    
    if docker exec -i "${DB_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" &>/dev/null; then
        echo "[DR-FAILOVER] Postgres recovered successfully after service restart."
        log_audit "RECOVERY_EXECUTED" "SUCCESS" "postgres_restart" "{\"status\":\"recovered\"}"
    else
        echo "[DR-FAILOVER] [FATAL] Database recovery failed. Initiating database restoration from latest backup..."
        LATEST_BACKUP=$(ls -t /backups/postgres/db_daily_*.enc | head -n 1 || echo "")
        if [ -n "${LATEST_BACKUP}" ]; then
            if ./restore-postgres.sh "${LATEST_BACKUP}"; then
                echo "[DR-FAILOVER] Database restored from backup."
                log_audit "RECOVERY_EXECUTED" "SUCCESS" "postgres_restore" "{\"restored_from\":\"${LATEST_BACKUP}\"}"
            else
                echo "[DR-FAILOVER] [FATAL] Database restoration failed!"
                log_audit "RECOVERY_EXECUTED" "FAILED" "postgres_restore_failed" "{\"error\":\"restore_script_failed\"}"
                exit 1
            fi
        else
            echo "[DR-FAILOVER] [FATAL] No valid backups found to restore from!"
            log_audit "RECOVERY_EXECUTED" "FAILED" "postgres_no_backup" "{\"error\":\"no_backup_found\"}"
            exit 1
        fi
    fi
fi

# 2. Redis Health Check
REDIS_STATUS="UP"
if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    PING_RESPONSE=$(docker exec -i "${REDIS_CONTAINER}" redis-cli ping || echo "failed")
    if [ "${PING_RESPONSE}" != "PONG" ]; then
        REDIS_STATUS="DOWN"
    fi
else
    REDIS_STATUS="DOWN"
fi

if [ "${REDIS_STATUS}" = "DOWN" ]; then
    echo "[DR-FAILOVER] [CRITICAL] Redis cache & queue store is offline!"
    log_audit "RECOVERY_EXECUTED" "IN_PROGRESS" "redis_failover" "{\"reason\":\"redis_offline\"}"
    
    echo "[DR-FAILOVER] Attempting Redis container restart..."
    docker restart "${REDIS_CONTAINER}" || true
    sleep 3
    
    PING_RESPONSE=$(docker exec -i "${REDIS_CONTAINER}" redis-cli ping || echo "failed")
    if [ "${PING_RESPONSE}" = "PONG" ]; then
        echo "[DR-FAILOVER] Redis recovered successfully after service restart."
        log_audit "RECOVERY_EXECUTED" "SUCCESS" "redis_restart" "{\"status\":\"recovered\"}"
    else
        echo "[DR-FAILOVER] [FATAL] Redis recovery failed. Restoring from snapshot backup..."
        LATEST_REDIS_BACKUP=$(ls -t /backups/redis/redis_raw_*.enc | head -n 1 || echo "")
        if [ -n "${LATEST_REDIS_BACKUP}" ]; then
            if ./restore-redis.sh "${LATEST_REDIS_BACKUP}"; then
                echo "[DR-FAILOVER] Redis restored from backup."
                log_audit "RECOVERY_EXECUTED" "SUCCESS" "redis_restore" "{\"restored_from\":\"${LATEST_REDIS_BACKUP}\"}"
            else
                echo "[DR-FAILOVER] [FATAL] Redis restoration failed!"
                log_audit "RECOVERY_EXECUTED" "FAILED" "redis_restore_failed" "{\"error\":\"restore_script_failed\"}"
                exit 1
            fi
        else
            echo "[DR-FAILOVER] [FATAL] No Redis snapshot backups found!"
            log_audit "RECOVERY_EXECUTED" "FAILED" "redis_no_backup" "{\"error\":\"no_backup_found\"}"
            exit 1
        fi
    fi
fi

echo "[DR-FAILOVER] Disaster recovery health check scan completed successfully. All services online."
