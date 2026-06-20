#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE=${1:-""}
DB_CONTAINER="support-ai-postgres-1"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path_to_backup.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file $BACKUP_FILE not found."
  exit 1
fi

echo "[RESTORE-POSTGRES] Restoring database $DB_NAME from $BACKUP_FILE..."

# Uncompress and pipe to pg_restore / psql
if docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
  # Terminate existing connections first to avoid lock issues
  docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${DB_NAME}'
      AND pid <> pg_backend_pid();
  "
  # Feed sql dump
  gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
else
  echo "[RESTORE-POSTGRES] Fallback: running psql locally..."
  gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" -d "$DB_NAME"
fi

echo "[RESTORE-POSTGRES] Database restoration completed successfully."
