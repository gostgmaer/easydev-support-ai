#!/usr/bin/env bash
# --- Disaster Recovery Backup Cleanup & Retention Policy Manager ---
set -euo pipefail

BACKUP_DIR="/backups/postgres"
REDIS_BACKUP_DIR="/backups/redis"

# Retention Policies in Days
RETENTION_HOURLY=2
RETENTION_DAILY=7
RETENTION_WEEKLY=30
RETENTION_MONTHLY=365

echo "[CLEANUP] Commencing cleanup of expired backups..."

# Safeguard: Never delete the very last backup of any type
safe_purge() {
    local directory=$1
    local pattern=$2
    local retention_days=$3
    
    echo "[CLEANUP] Processing ${pattern} in ${directory} (Retention: ${retention_days} days)..."
    
    # Check total matching files
    local files=()
    while IFS= read -r line; do
        files+=("$line")
    done < <(find "${directory}" -name "${pattern}" -type f | sort)
    
    local count=${#files[@]}
    if [ "${count}" -le 1 ]; then
        echo "  - Less than or equal to 1 backup found. Safety trigger activated: Skipping purge."
        return
    fi
    
    # Calculate cutoff date
    local cutoff_seconds=$(date -d "${retention_days} days ago" +%s || date -v -"${retention_days}"d +%s)
    
    # Iterate and delete expired, preserving the latest one
    for ((i=0; i<count-1; i++)); do
        local file="${files[i]}"
        local file_mtime=$(stat -c %Y "${file}")
        
        if [ "${file_mtime}" -lt "${cutoff_seconds}" ]; then
            echo "  - Deleting expired backup: $(basename "${file}")"
            rm -f "${file}"
        fi
    done
}

# Run safe purges for postgres backups
if [ -d "${BACKUP_DIR}" ]; then
    safe_purge "${BACKUP_DIR}" "db_hourly_*.enc" ${RETENTION_HOURLY}
    safe_purge "${BACKUP_DIR}" "db_daily_*.enc" ${RETENTION_DAILY}
    safe_purge "${BACKUP_DIR}" "db_weekly_*.enc" ${RETENTION_WEEKLY}
    safe_purge "${BACKUP_DIR}" "db_monthly_*.enc" ${RETENTION_MONTHLY}
fi

# Run safe purges for redis backups
if [ -d "${REDIS_BACKUP_DIR}" ]; then
    safe_purge "${REDIS_BACKUP_DIR}" "redis_raw_*.enc" ${RETENTION_DAILY}
fi

echo "[CLEANUP] Backup cleanup operations completed."
