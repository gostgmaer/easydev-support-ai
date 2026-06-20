#!/usr/bin/env bash
# --- Restore Script for Nginx Configuration & SSL Credentials ---
set -euo pipefail

BACKUP_FILE="${1:-}"
TEMP_RESTORE_DIR="/tmp/nginx_restore"

if [ -z "${BACKUP_FILE}" ]; then
    echo "[RESTORE] [ERROR] Backup archive path must be provided as the first parameter."
    echo "Usage: $0 /var/backups/nginx/nginx_backup_YYYYMMDD_HHMMSS.tar.gz"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[RESTORE] [ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "[RESTORE] Commencing restoration process from: ${BACKUP_FILE}"

# 1. Clean up old restoration directory and unpack backup
rm -rf "${TEMP_RESTORE_DIR}"
mkdir -p "${TEMP_RESTORE_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_RESTORE_DIR}"

# 2. Back up active configuration in case restoration fails (Internal Rollback System)
echo "[RESTORE] backing up current live configurations for safety rollback..."
mkdir -p /tmp/nginx_active_backup
tar -czf /tmp/nginx_active_backup/safety_backup.tar.gz -C / etc/nginx var/www/letsencrypt 2>/dev/null || true

# 3. Swap current configurations
echo "[RESTORE] Copying configurations and credentials back to system folders..."
if [ -d "${TEMP_RESTORE_DIR}/etc/nginx" ]; then
    rm -rf /etc/nginx/*
    cp -r "${TEMP_RESTORE_DIR}/etc/nginx/"* /etc/nginx/
fi
if [ -d "${TEMP_RESTORE_DIR}/var/www/letsencrypt" ]; then
    rm -rf /var/www/letsencrypt/*
    cp -r "${TEMP_RESTORE_DIR}/var/www/letsencrypt/"* /var/www/letsencrypt/
fi

# 4. Validate configuration integrity
echo "[RESTORE] Validating restored configuration integrity..."
if command -v nginx &> /dev/null; then
    if nginx -t; then
        echo "[RESTORE] Config file validation succeeded. Reloading Nginx daemon..."
        nginx -s reload
        echo "[RESTORE] Nginx daemon reloaded successfully. Restore Complete."
    else
        echo "[RESTORE] [CRITICAL] Restored configuration validation failed! Triggering automatic rollback..."
        # Trigger Rollback
        rm -rf /etc/nginx/*
        tar -xzf /tmp/nginx_active_backup/safety_backup.tar.gz -C /
        nginx -s reload
        echo "[RESTORE] Rollback executed successfully. System state is restored to pre-restore state."
        exit 1
    fi
fi
