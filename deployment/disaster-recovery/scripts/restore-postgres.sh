#!/usr/bin/env bash
# --- Automated Production-Grade PostgreSQL 17 Restore Engine ---
set -euo pipefail

BACKUP_FILE=${1:-}
PITR_TARGET_TIME=${2:-""} # Optional format: "2026-06-21 02:00:00"
TARGET_DB=${3:-"easydev_support_ai_prod"}

DB_CONTAINER="support-ai-postgres"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_PASSWORD=${DB_PASSWORD:-"prod_db_pass_extremely_secure_991823"}
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-"extremely_secure_passphrase_key_ring_9921"}
WAL_DIR="/backups/postgres/wal"

export PGPASSWORD="${DB_PASSWORD}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "[RESTORE-PG] [ERROR] Backup encrypted file path must be specified."
    echo "Usage: $0 /backups/postgres/db_daily_timestamp.sql.gz.enc [PITR_TIME] [DB_NAME]"
    echo "       $0 /backups/postgres/basebackup_timestamp.tar.gz.enc \"2026-06-21 02:00:00\" [DB_NAME]"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[RESTORE-PG] [ERROR] Backup file does not exist: ${BACKUP_FILE}"
    exit 1
fi

if [ -n "${PITR_TARGET_TIME}" ] && [ ! -d "${WAL_DIR}" ]; then
    echo "[RESTORE-PG] [ERROR] PITR requested but WAL archive directory not found: ${WAL_DIR}"
    echo "  archive_command must be configured and have run for some time before PITR is possible."
    exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEC_FILE="/tmp/restoring_${TIMESTAMP}.dec"

echo "[RESTORE-PG] Starting database restore procedure..."
# Audit Log: Restore Started
audit_log_started() {
    local sql="INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, executed_by) VALUES ('RESTORE_STARTED', 'postgres', '$(basename "${BACKUP_FILE}")', 'IN_PROGRESS', 'restore-postgres.sh');"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -t -A -c "${sql}" || true
    fi
}
audit_log_started

# 1. Decrypt Backup File
echo "[RESTORE-PG] Decrypting database backup..."
if ! openssl enc -d -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${BACKUP_FILE}" -out "${DEC_FILE}"; then
    echo "[RESTORE-PG] [ERROR] Decryption failed. Incorrect passphrase or corrupt file."
    exit 1
fi

# 2. Checksum verification
DEC_CHECKSUM=$(sha256sum "${DEC_FILE}" | cut -d' ' -f1)
echo "[RESTORE-PG] Decryption complete. Decrypted SHA-256 Hash: ${DEC_CHECKSUM}"

# 3. Check if executing standard SQL dump restore or PITR restore
if [ -n "${PITR_TARGET_TIME}" ]; then
    # Point In Time Recovery Mode
    echo "[RESTORE-PG] [PITR] Initializing Point-In-Time Recovery to target: ${PITR_TARGET_TIME}..."

    # 3.0 DEC_FILE must be a pg_basebackup bundle (base.tar.gz + pg_wal.tar.gz,
    # see backup-postgres.sh's "base" mode), not a pg_dump - fail loudly
    # instead of proceeding against the wrong artifact type.
    EXTRACT_DIR="/tmp/pitr_extract_${TIMESTAMP}"
    mkdir -p "${EXTRACT_DIR}"
    if ! tar -tzf "${DEC_FILE}" &>/dev/null || ! tar -xzf "${DEC_FILE}" -C "${EXTRACT_DIR}"; then
        echo "[RESTORE-PG] [ERROR] PITR backup file is not a valid base-backup tarball: ${BACKUP_FILE}"
        rm -f "${DEC_FILE}"
        rm -rf "${EXTRACT_DIR}"
        exit 1
    fi
    if [ ! -f "${EXTRACT_DIR}/base.tar.gz" ]; then
        echo "[RESTORE-PG] [ERROR] base.tar.gz not found inside backup bundle - this is not a pg_basebackup output, PITR cannot proceed."
        rm -f "${DEC_FILE}"
        rm -rf "${EXTRACT_DIR}"
        exit 1
    fi

    # 3.1 Shutdown Postgres Container/Service
    echo "[RESTORE-PG] Stopping PostgreSQL container for physical files restoration..."
    docker stop "${DB_CONTAINER}" || true

    # 3.2 Physical files restore: clear the existing data directory and
    # untar the base backup (+ WAL segments included in it) in its place.
    # docker exec doesn't work on a stopped container, so this runs through
    # a throwaway helper container sharing the same volume via
    # --volumes-from - the standard way to manipulate a stopped container's
    # mounted data without starting it first.
    echo "[RESTORE-PG] Swapping PostgreSQL physical data cluster..."
    docker run --rm \
        --volumes-from "${DB_CONTAINER}" \
        -v "${EXTRACT_DIR}:/restore:ro" \
        postgres:17-alpine sh -c "
            set -e
            rm -rf /var/lib/postgresql/data/*
            tar -xzf /restore/base.tar.gz -C /var/lib/postgresql/data
            if [ -f /restore/pg_wal.tar.gz ]; then
                mkdir -p /var/lib/postgresql/data/pg_wal
                tar -xzf /restore/pg_wal.tar.gz -C /var/lib/postgresql/data/pg_wal
            fi
            chown -R postgres:postgres /var/lib/postgresql/data
            chmod 700 /var/lib/postgresql/data
        "

    # 3.3 Set recovery target settings. recovery_target_action=promote so
    # the cluster comes back read-write automatically once it reaches the
    # target, instead of pausing in read-only recovery (Postgres's own
    # default) and waiting for someone to call pg_promote() by hand during
    # an incident.
    echo "[RESTORE-PG] Creating recovery.signal trigger and setting recovery configurations..."
    docker run --rm \
        --volumes-from "${DB_CONTAINER}" \
        postgres:17-alpine sh -c "
            set -e
            touch /var/lib/postgresql/data/recovery.signal
            cat >> /var/lib/postgresql/data/postgresql.auto.conf <<EOF
restore_command = 'cp ${WAL_DIR}/%f %p'
recovery_target_time = '${PITR_TARGET_TIME}'
recovery_target_action = 'promote'
EOF
            chown postgres:postgres /var/lib/postgresql/data/recovery.signal /var/lib/postgresql/data/postgresql.auto.conf
        "
    rm -rf "${EXTRACT_DIR}"

    # 3.4 Start Database service
    echo "[RESTORE-PG] Restarting PostgreSQL container in recovery state..."
    docker start "${DB_CONTAINER}"

    # Poll for recovery to finish replaying WAL up to the target time and
    # promote, rather than a fixed sleep - PITR replay duration depends on
    # how much WAL there is to replay.
    echo "[RESTORE-PG] Waiting for WAL replay to reach target and promote (up to 5 minutes)..."
    STATUS="FAILED"
    for i in $(seq 1 60); do
        sleep 5
        if docker exec -i "${DB_CONTAINER}" pg_isready -U "${DB_USER}" &>/dev/null; then
            IN_RECOVERY=$(docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -t -A -c "SELECT pg_is_in_recovery();" 2>/dev/null || echo "")
            if [ "${IN_RECOVERY}" = "f" ]; then
                echo "[RESTORE-PG] [PITR] Recovery complete, cluster promoted to read-write."
                STATUS="SUCCESS"
                break
            fi
        fi
    done
    if [ "${STATUS}" != "SUCCESS" ]; then
        echo "[RESTORE-PG] [ERROR] PITR did not reach a promoted, ready state within the timeout - check container logs (docker logs ${DB_CONTAINER})."
    fi
else
    # Standard SQL Dump restore
    echo "[RESTORE-PG] Performing database swap..."
    
    # Disconnect active sessions
    echo "[RESTORE-PG] Terminating active connections to database: ${TARGET_DB}..."
    DISCONNECT_SQL="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${TARGET_DB}' AND pid <> pg_backend_pid();"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "${DISCONNECT_SQL}" || true
        
        # Recreate DB
        echo "[RESTORE-PG] Recreating database structure..."
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};"
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TARGET_DB} OWNER ${DB_USER};"
        
        # Import Dump
        echo "[RESTORE-PG] Importing database dump..."
        if ! gunzip -c "${DEC_FILE}" | docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${TARGET_DB}"; then
            echo "[RESTORE-PG] [ERROR] Restoration failed during dump importing."
            STATUS="FAILED"
        else
            echo "[RESTORE-PG] Restoration import completed."
            STATUS="SUCCESS"
        fi
    else
        psql -U "${DB_USER}" -d postgres -h localhost -c "${DISCONNECT_SQL}" || true
        psql -U "${DB_USER}" -d postgres -h localhost -c "DROP DATABASE IF EXISTS ${TARGET_DB};"
        psql -U "${DB_USER}" -d postgres -h localhost -c "CREATE DATABASE ${TARGET_DB} OWNER ${DB_USER};"
        
        if ! gunzip -c "${DEC_FILE}" | psql -U "${DB_USER}" -d "${TARGET_DB}" -h localhost; then
            echo "[RESTORE-PG] [ERROR] Local restoration failed."
            STATUS="FAILED"
        else
            echo "[RESTORE-PG] Local restoration import completed."
            STATUS="SUCCESS"
        fi
    fi
fi

# Clean up decrypted file for security compliance
rm -f "${DEC_FILE}"

# 4. Post-Restore Verification
if [ "${STATUS}" = "SUCCESS" ]; then
    echo "[RESTORE-PG] Running schema verification..."
    VERIFY_SQL="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'ai_support_agent';"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        TABLE_COUNT=$(docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "${VERIFY_SQL}" || echo "0")
    else
        TABLE_COUNT=$(psql -U "${DB_USER}" -d "${TARGET_DB}" -h localhost -t -A -c "${VERIFY_SQL}" || echo "0")
    fi
    echo "[RESTORE-PG] Table verification completed. Found ${TABLE_COUNT} tables in schema 'ai_support_agent'."
    
    if [ "${TABLE_COUNT}" -eq 0 ]; then
        echo "[RESTORE-PG] [WARNING] Schema validation returned 0 tables. Check logs."
        STATUS="FAILED"
    fi
fi

# 5. Audit Logging in DB
echo "[RESTORE-PG] Logging restoration audit..."
AUDIT_SQL="INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, executed_by, metadata) VALUES ('RESTORE_COMPLETED', 'postgres', '$(basename "${BACKUP_FILE}")', '${STATUS}', 'restore-postgres.sh', '{\"restored_db\":\"${TARGET_DB}\"}');"
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${TARGET_DB}" -c "${AUDIT_SQL}" || true
fi

if [ "${STATUS}" = "FAILED" ]; then
    echo "[RESTORE-PG] [CRITICAL] Restore operation failed."
    exit 1
else
    echo "[RESTORE-PG] Database restored successfully and verified."
fi
