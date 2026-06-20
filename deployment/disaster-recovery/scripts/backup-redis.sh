#!/usr/bin/env bash
# --- Automated Production-Grade Redis 8 Backup Suite ---
set -euo pipefail

BACKUP_DIR="/backups/redis"
REDIS_CONTAINER="support-ai-redis"
REDIS_DATA_DIR="/data"
REDIS_HOST=${REDIS_HOST:-"localhost"}
REDIS_PORT=${REDIS_PORT:-6379}
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-"extremely_secure_passphrase_key_ring_9921"}

# Postgres Credentials (for audit logging)
DB_CONTAINER="support-ai-postgres"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
DB_PASSWORD=${DB_PASSWORD:-"prod_db_pass_extremely_secure_991823"}

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RAW_ARCHIVE="${BACKUP_DIR}/redis_raw_${TIMESTAMP}.tar.gz"
ENC_ARCHIVE="${RAW_ARCHIVE}.enc"

mkdir -p "${BACKUP_DIR}"

# Helper function to write audit log in postgres database
log_audit() {
    local action=$1
    local status=$2
    local target=$3
    local checksum=$4
    local size=$5
    local metadata=$6

    local sql="INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, checksum, size_bytes, metadata, executed_by) VALUES ('${action}', 'redis', '${target}', '${status}', '${checksum}', ${size}, '${metadata}', 'backup-redis.sh');"
    export PGPASSWORD="${DB_PASSWORD}"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "${sql}" || true
    else
        psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -c "${sql}" || true
    fi
}

echo "[BACKUP-REDIS] Initiating Redis snapshot backup..."

# 1. Trigger Redis BGSAVE (Background Save)
echo "[BACKUP-REDIS] Triggering BGSAVE command..."
if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    docker exec -i "${REDIS_CONTAINER}" redis-cli BGSAVE
else
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE
fi

# 2. Wait for BGSAVE completion
echo "[BACKUP-REDIS] Waiting for snapshot saving to complete..."
for i in {1..30}; do
    if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
        save_status=$(docker exec -i "${REDIS_CONTAINER}" redis-cli info persistence | grep rdb_bgsave_in_progress | tr -d '\r' | cut -d: -f2)
    else
        save_status=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" info persistence | grep rdb_bgsave_in_progress | tr -d '\r' | cut -d: -f2)
    fi
    
    if [ "${save_status}" = "0" ]; then
        echo "[BACKUP-REDIS] Redis snapshot saved successfully."
        break
    fi
    echo "[BACKUP-REDIS] Save in progress... waiting 2s..."
    sleep 2
done

# 3. Create Archive (RDB and AOF files)
echo "[BACKUP-REDIS] Creating backup tarball..."
# Extract path in host or container context
if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    # Copy files out of container for backup
    rm -rf /tmp/redis_backup_tmp
    mkdir -p /tmp/redis_backup_tmp
    docker cp "${REDIS_CONTAINER}:${REDIS_DATA_DIR}/dump.rdb" /tmp/redis_backup_tmp/ || true
    docker cp "${REDIS_CONTAINER}:${REDIS_DATA_DIR}/appendonly.aof" /tmp/redis_backup_tmp/ || true
    # Redis 7+ uses appendonlydir directory for AOF
    docker cp "${REDIS_CONTAINER}:${REDIS_DATA_DIR}/appendonlydir" /tmp/redis_backup_tmp/ || true
    
    tar -czf "${RAW_ARCHIVE}" -C /tmp/redis_backup_tmp .
    rm -rf /tmp/redis_backup_tmp
else
    tar -czf "${RAW_ARCHIVE}" -C "${REDIS_DATA_DIR}" . 2>/dev/null || true
fi

SIZE_BYTES=$(stat -c%s "${RAW_ARCHIVE}")
RAW_CHECKSUM=$(sha256sum "${RAW_ARCHIVE}" | cut -d' ' -f1)

# 4. Encrypt Archive
echo "[BACKUP-REDIS] Encrypting Redis backup..."
if ! openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${RAW_ARCHIVE}" -out "${ENC_ARCHIVE}"; then
    echo "[BACKUP-REDIS] [ERROR] Redis backup encryption failed."
    rm -f "${RAW_ARCHIVE}"
    exit 1
fi

ENC_CHECKSUM=$(sha256sum "${ENC_ARCHIVE}" | cut -d' ' -f1)
rm -f "${RAW_ARCHIVE}"

# 5. Verify Backup
echo "[BACKUP-REDIS] Verifying encrypted archive integrity..."
VERIFY_FILE="/tmp/redis_verify_${TIMESTAMP}.tar.gz"
if openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${ENC_ARCHIVE}" -out "${VERIFY_FILE}"; then
    if tar -tzf "${VERIFY_FILE}" &>/dev/null; then
        echo "  - [OK] Backup file decrypts and verifies successfully."
        VERIFY_STATUS="SUCCESS"
    else
        echo "  - [FAIL] Tar file verification failed."
        VERIFY_STATUS="FAILED"
    fi
    rm -f "${VERIFY_FILE}"
else
    echo "  - [FAIL] Decryption test failed."
    VERIFY_STATUS="FAILED"
fi

# 6. Audit Log
log_audit "BACKUP_CREATED" "${VERIFY_STATUS}" "$(basename "${ENC_ARCHIVE}")" "${ENC_CHECKSUM}" "${SIZE_BYTES}" "{\"raw_checksum\":\"${RAW_CHECKSUM}\",\"enc_checksum\":\"${ENC_CHECKSUM}\"}"

if [ "${VERIFY_STATUS}" = "FAILED" ]; then
    echo "[BACKUP-REDIS] [CRITICAL] Redis backup verification failed."
    exit 1
fi

# 7. Sync to Object Storage
if [ -f "./object-storage-sync.sh" ]; then
    ./object-storage-sync.sh "${ENC_ARCHIVE}"
fi

echo "[BACKUP-REDIS] Backup process finished successfully."
