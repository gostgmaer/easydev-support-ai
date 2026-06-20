#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/backups/postgres"
DB_CONTAINER="support-ai-postgres-1" # Container name in production
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"

echo "[BACKUP-POSTGRES] Initiating database dump for $DB_NAME..."

# Execute pg_dump inside container and pipe to gzip
if docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
  docker exec -t "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"
  echo "[BACKUP-POSTGRES] Backup successfully written to $BACKUP_FILE"
else
  echo "[BACKUP-POSTGRES] Fallback: running pg_dump locally..."
  pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"
  echo "[BACKUP-POSTGRES] Backup written to $BACKUP_FILE"
fi

# Apply retention policy
echo "[BACKUP-POSTGRES] Purging backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
echo "[BACKUP-POSTGRES] Purge complete."
