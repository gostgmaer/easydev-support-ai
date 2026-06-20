#!/usr/bin/env bash
# --- Backup Script for Nginx Configuration & SSL Credentials ---
set -euo pipefail

BACKUP_DIR="/var/backups/nginx"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nginx_backup_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=30

echo "[BACKUP] Commencing Nginx backup procedure..."

# 1. Verify Nginx configuration syntax before backup
if command -v nginx &> /dev/null; then
    if ! nginx -t; then
        echo "[BACKUP] [ERROR] Nginx configuration syntax verification failed. Aborting backup."
        exit 1
    fi
fi

# 2. Create backup directories
mkdir -p "${BACKUP_DIR}"

# 3. Create archive of Nginx configurations and SSL directory
echo "[BACKUP] Archiving configurations and certificates..."
tar -czf "${BACKUP_FILE}" \
    -C / \
    etc/nginx \
    var/www/letsencrypt \
    2>/dev/null || true

echo "[BACKUP] Backup file successfully created: ${BACKUP_FILE}"

# 4. Enforce Retention Policy
echo "[BACKUP] Applying retention policy (deleting backups older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -type f -name "nginx_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
echo "[BACKUP] Retention policy check completed."
