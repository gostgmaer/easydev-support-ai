#!/usr/bin/env bash
# --- Automated Production-Grade Redis 8 Restore Engine ---
set -euo pipefail

BACKUP_FILE=${1:-}
REDIS_CONTAINER="support-ai-redis"
REDIS_DATA_DIR="/data"
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-"extremely_secure_passphrase_key_ring_9921"}

# Postgres Credentials (for audit logging)
DB_CONTAINER="support-ai-postgres"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
DB_PASSWORD=${DB_PASSWORD:-"prod_db_pass_extremely_secure_991823"}

if [ -z "${BACKUP_FILE}" ]; then
    echo "[RESTORE-REDIS] [ERROR] Backup archive path must be specified."
    echo "Usage: $0 /backups/redis/redis_raw_timestamp.tar.gz.enc"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[RESTORE-REDIS] [ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_UNPACK_DIR="/tmp/redis_restore_${TIMESTAMP}"
DEC_FILE="/tmp/redis_decrypted_${TIMESTAMP}.tar.gz"

mkdir -p "${TEMP_UNPACK_DIR}"

# Helper function to write audit log in postgres database
log_audit() {
    local action=$1
    local status=$2
    local target=$3
    local checksum=$4
    local size=$5
    local metadata=$6

    local sql="INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, checksum, size_bytes, metadata, executed_by) VALUES ('${action}', 'redis', '${target}', '${status}', '${checksum}', ${size}, '${metadata}', 'restore-redis.sh');"
    export PGPASSWORD="${DB_PASSWORD}"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "${sql}" || true
    fi
}

echo "[RESTORE-REDIS] Commencing Redis restore process..."
log_audit "RESTORE_STARTED" "IN_PROGRESS" "$(basename "${BACKUP_FILE}")" "" 0 "{}"

# 1. Decrypt Backup File
echo "[RESTORE-REDIS] Decrypting archive..."
if ! openssl enc -d -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${BACKUP_FILE}" -out "${DEC_FILE}"; then
    echo "[RESTORE-REDIS] [ERROR] Decryption failed. Incorrect passphrase or corrupt file."
    log_audit "RESTORE_FAILED" "FAILED" "$(basename "${BACKUP_FILE}")" "" 0 "{\"error\":\"decryption_failed\"}"
    exit 1
fi

DEC_CHECKSUM=$(sha256sum "${DEC_FILE}" | cut -d' ' -f1)
SIZE_BYTES=$(stat -c%s "${DEC_FILE}")

# 2. Unpack backup contents
echo "[RESTORE-REDIS] Unpacking archive contents..."
if ! tar -xzf "${DEC_FILE}" -C "${TEMP_UNPACK_DIR}"; then
    echo "[RESTORE-REDIS] [ERROR] Tar unpacking failed."
    rm -f "${DEC_FILE}"
    rm -rf "${TEMP_UNPACK_DIR}"
    log_audit "RESTORE_FAILED" "FAILED" "$(basename "${BACKUP_FILE}")" "${DEC_CHECKSUM}" "${SIZE_BYTES}" "{\"error\":\"tar_unpack_failed\"}"
    exit 1
fi

# 3. Swap Data Directories (Needs Redis container shutdown/restart)
echo "[RESTORE-REDIS] Stopping Redis container: ${REDIS_CONTAINER}..."
docker stop "${REDIS_CONTAINER}" || true

echo "[RESTORE-REDIS] Replacing Redis active persistence data files..."
# RDB/AOF must be in place before Redis starts (it loads them at startup),
# and docker exec doesn't work on a stopped container - so this runs
# through a throwaway helper container that shares the same volume via
# --volumes-from, the standard way to manipulate a stopped container's
# mounted data. Clears stale persistence files first so old AOF segments
# don't end up mixed in alongside the restored ones.
echo "[RESTORE-REDIS] Swapping database files in volume..."
if ! docker run --rm \
    --volumes-from "${REDIS_CONTAINER}" \
    -v "${TEMP_UNPACK_DIR}:/restore:ro" \
    alpine sh -c "
        set -e
        rm -rf ${REDIS_DATA_DIR}/dump.rdb ${REDIS_DATA_DIR}/appendonly.aof ${REDIS_DATA_DIR}/appendonlydir
        cp -a /restore/. ${REDIS_DATA_DIR}/
    "; then
    echo "[RESTORE-REDIS] [ERROR] Failed to swap Redis persistence files into the data volume."
    rm -f "${DEC_FILE}"
    rm -rf "${TEMP_UNPACK_DIR}"
    log_audit "RESTORE_FAILED" "FAILED" "$(basename "${BACKUP_FILE}")" "${DEC_CHECKSUM}" "${SIZE_BYTES}" "{\"error\":\"volume_swap_failed\"}"
    exit 1
fi

# 4. Restart Redis container
echo "[RESTORE-REDIS] Starting Redis container..."
docker start "${REDIS_CONTAINER}"

# Wait for database startup
sleep 3

# 5. Post-Restore Health Verification
echo "[RESTORE-REDIS] Verifying Redis connection..."
STATUS="SUCCESS"
if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    PING_RESPONSE=$(docker exec -i "${REDIS_CONTAINER}" redis-cli ping | tr -d '\r\n')
    if [ "${PING_RESPONSE}" = "PONG" ]; then
        echo "  - [OK] Redis responded to ping (PONG)."
    else
        echo "  - [FAIL] Redis ping response: ${PING_RESPONSE}"
        STATUS="FAILED"
    fi
else
    STATUS="FAILED"
fi

# Clean up temp files
rm -f "${DEC_FILE}"
rm -rf "${TEMP_UNPACK_DIR}"

# 6. Audit log
log_audit "RESTORE_COMPLETED" "${STATUS}" "$(basename "${BACKUP_FILE}")" "${DEC_CHECKSUM}" "${SIZE_BYTES}" "{\"verification\":\"${STATUS}\"}"

if [ "${STATUS}" = "FAILED" ]; then
    echo "[RESTORE-REDIS] [CRITICAL] Redis restoration verification check failed."
    exit 1
else
    echo "[RESTORE-REDIS] Redis restoration completed successfully."
fi
