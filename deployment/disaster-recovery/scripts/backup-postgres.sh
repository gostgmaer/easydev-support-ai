#!/usr/bin/env bash
# --- Automated Production-Grade PostgreSQL 17 Backup Suite ---
set -euo pipefail

BACKUP_DIR="/backups/postgres"
WAL_DIR="/backups/postgres/wal"
DB_CONTAINER="support-ai-postgres"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
DB_PASSWORD=${DB_PASSWORD:-"prod_db_pass_extremely_secure_991823"}
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-"extremely_secure_passphrase_key_ring_9921"}
BACKUP_TYPE=${1:-"daily"} # "hourly", "daily", "weekly", "monthly"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RAW_BACKUP_FILE="${BACKUP_DIR}/db_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"
ENC_BACKUP_FILE="${RAW_BACKUP_FILE}.enc"

mkdir -p "${BACKUP_DIR}" "${WAL_DIR}"

export PGPASSWORD="${DB_PASSWORD}"

# Helper function to run psql queries
run_query() {
    local sql=$1
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "${sql}" || true
    else
        psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -t -A -c "${sql}" || true
    fi
}

echo "[BACKUP-PG] Starting PostgreSQL '${BACKUP_TYPE}' backup procedure..."

# 0. Physical base backup - the actual input PITR restore needs. pg_dump
# (below) is a logical export that can only be restored to the moment it was
# taken; PITR replays WAL on top of a physical base backup to reach any
# point in time. Produces basebackup_<timestamp>.tar.gz next to the WAL
# archive, which restore-postgres.sh's PITR branch consumes.
if [ "${BACKUP_TYPE}" = "base" ]; then
    # pg_basebackup -Ft produces base.tar.gz AND pg_wal.tar.gz (the WAL
    # segments needed to make the base backup consistent) - both are
    # required for restore, so bundle the whole output directory rather
    # than copying base.tar.gz alone.
    BASEBACKUP_FILE="${BACKUP_DIR}/basebackup_${TIMESTAMP}.tar.gz"
    echo "[BACKUP-PG] Taking physical base backup (pg_basebackup)..."
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" mkdir -p /tmp/basebackup_${TIMESTAMP}
        if ! docker exec -i "${DB_CONTAINER}" pg_basebackup -U "${DB_USER}" -D /tmp/basebackup_${TIMESTAMP} -Ft -z -X fetch; then
            echo "[BACKUP-PG] [ERROR] pg_basebackup failed inside container."
            docker exec -i "${DB_CONTAINER}" rm -rf /tmp/basebackup_${TIMESTAMP} || true
            exit 1
        fi
        rm -rf "/tmp/basebackup_bundle_${TIMESTAMP}"
        mkdir -p "/tmp/basebackup_bundle_${TIMESTAMP}"
        docker cp "${DB_CONTAINER}:/tmp/basebackup_${TIMESTAMP}/." "/tmp/basebackup_bundle_${TIMESTAMP}/"
        docker exec -i "${DB_CONTAINER}" rm -rf /tmp/basebackup_${TIMESTAMP}
        tar -czf "${BASEBACKUP_FILE}" -C "/tmp/basebackup_bundle_${TIMESTAMP}" .
        rm -rf "/tmp/basebackup_bundle_${TIMESTAMP}"
    else
        TMP_BASE_DIR="/tmp/basebackup_${TIMESTAMP}"
        mkdir -p "${TMP_BASE_DIR}"
        if ! pg_basebackup -U "${DB_USER}" -h localhost -D "${TMP_BASE_DIR}" -Ft -z -X fetch; then
            echo "[BACKUP-PG] [ERROR] Local pg_basebackup failed."
            rm -rf "${TMP_BASE_DIR}"
            exit 1
        fi
        tar -czf "${BASEBACKUP_FILE}" -C "${TMP_BASE_DIR}" .
        rm -rf "${TMP_BASE_DIR}"
    fi

    echo "[BACKUP-PG] Encrypting base backup using AES-256..."
    ENC_BASEBACKUP_FILE="${BASEBACKUP_FILE}.enc"
    if ! openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${BASEBACKUP_FILE}" -out "${ENC_BASEBACKUP_FILE}"; then
        echo "[BACKUP-PG] [ERROR] Base backup encryption failed."
        rm -f "${BASEBACKUP_FILE}"
        exit 1
    fi
    rm -f "${BASEBACKUP_FILE}"

    BASE_CHECKSUM=$(sha256sum "${ENC_BASEBACKUP_FILE}" | cut -d' ' -f1)
    BASE_SIZE=$(stat -c%s "${ENC_BASEBACKUP_FILE}")
    echo "[BACKUP-PG] Base backup complete. Size: ${BASE_SIZE} bytes. Checksum: ${BASE_CHECKSUM}"
    run_query "INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, checksum, size_bytes, executed_by) VALUES ('BACKUP_CREATED', 'postgres_basebackup', '$(basename "${ENC_BASEBACKUP_FILE}")', 'SUCCESS', '${BASE_CHECKSUM}', ${BASE_SIZE}, 'backup-postgres.sh');"

    if [ -f "./object-storage-sync.sh" ]; then
        ./object-storage-sync.sh "${ENC_BASEBACKUP_FILE}"
    fi
    echo "[BACKUP-PG] Base backup process finished successfully."
    exit 0
fi

# 1. Action Trigger
if [ "${BACKUP_TYPE}" = "hourly" ]; then
    # Hourly is incremental: trigger WAL segment switch
    echo "[BACKUP-PG] Triggering WAL rotation for incremental recovery..."
    run_query "SELECT pg_switch_wal();"
    
    # Audit log
    run_query "INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, executed_by) VALUES ('BACKUP_CREATED', 'postgres', 'wal_switch_${TIMESTAMP}', 'SUCCESS', 'backup-postgres.sh');"
    echo "[BACKUP-PG] WAL segment switch triggered successfully."
    exit 0
fi

# 2. Daily/Weekly/Monthly: Execute pg_dump
echo "[BACKUP-PG] Dumping database contents..."
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    if ! docker exec -t "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${RAW_BACKUP_FILE}"; then
        echo "[BACKUP-PG] [ERROR] pg_dump execution failed inside container."
        exit 1
    fi
else
    if ! pg_dump -U "${DB_USER}" -d "${DB_NAME}" -h localhost | gzip > "${RAW_BACKUP_FILE}"; then
        echo "[BACKUP-PG] [ERROR] Local pg_dump execution failed."
        exit 1
    fi
fi

# 3. Calculate Checksum
RAW_CHECKSUM=$(sha256sum "${RAW_BACKUP_FILE}" | cut -d' ' -f1)
SIZE_BYTES=$(stat -c%s "${RAW_BACKUP_FILE}")
echo "[BACKUP-PG] Dump completed. Size: ${SIZE_BYTES} bytes. Checksum: ${RAW_CHECKSUM}"

# 4. Encrypt Backup File
echo "[BACKUP-PG] Encrypting backup file using AES-256..."
if ! openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${RAW_BACKUP_FILE}" -out "${ENC_BACKUP_FILE}"; then
    echo "[BACKUP-PG] [ERROR] Encryption failed."
    rm -f "${RAW_BACKUP_FILE}"
    exit 1
fi

ENC_CHECKSUM=$(sha256sum "${ENC_BACKUP_FILE}" | cut -d' ' -f1)
echo "[BACKUP-PG] Encryption complete. Encrypted Checksum: ${ENC_CHECKSUM}"

# Clean up raw backup file for security compliance
rm -f "${RAW_BACKUP_FILE}"

# 5. Verification Phase (Decrypt and check format)
echo "[BACKUP-PG] Verifying backup integrity..."
VERIFY_FILE="/tmp/verify_${TIMESTAMP}.sql.gz"
if openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${ENC_BACKUP_FILE}" -out "${VERIFY_FILE}"; then
    if gzip -t "${VERIFY_FILE}"; then
        echo "  - [OK] Backup file decrypts and decompresses successfully."
        VERIFY_STATUS="SUCCESS"
    else
        echo "  - [FAIL] Decompression test failed."
        VERIFY_STATUS="FAILED"
    fi
    rm -f "${VERIFY_FILE}"
else
    echo "  - [FAIL] Decryption test failed."
    VERIFY_STATUS="FAILED"
fi

# 6. Audit Logging in DB
METADATA="{\"type\":\"${BACKUP_TYPE}\",\"raw_checksum\":\"${RAW_CHECKSUM}\",\"enc_checksum\":\"${ENC_CHECKSUM}\",\"verification\":\"${VERIFY_STATUS}\"}"
run_query "INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, checksum, size_bytes, metadata, executed_by) VALUES ('BACKUP_CREATED', 'postgres', '$(basename "${ENC_BACKUP_FILE}")', '${VERIFY_STATUS}', '${ENC_CHECKSUM}', ${SIZE_BYTES}, '${METADATA}', 'backup-postgres.sh');"

if [ "${VERIFY_STATUS}" = "FAILED" ]; then
    echo "[BACKUP-PG] [CRITICAL] Backup verification failed. Terminating."
    exit 1
fi

# 7. Sync to Object Storage
if [ -f "./object-storage-sync.sh" ]; then
    ./object-storage-sync.sh "${ENC_BACKUP_FILE}"
fi

echo "[BACKUP-PG] Backup completed successfully."
