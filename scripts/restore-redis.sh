#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE=${1:-""}
REDIS_CONTAINER="support-ai-redis-1"
REDIS_VOLUME_DIR="/var/lib/docker/volumes/easydev-support-ai_redis-data/_data"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path_to_backup.rdb.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file $BACKUP_FILE not found."
  exit 1
fi

echo "[RESTORE-REDIS] Restoring Redis database state..."

if docker ps -a --format '{{.Names}}' | grep -q "$REDIS_CONTAINER"; then
  # 1. Stop Redis
  echo "[RESTORE-REDIS] Stopping Redis container..."
  docker stop "$REDIS_CONTAINER"
  
  # 2. Extract dump.rdb to volume
  echo "[RESTORE-REDIS] Extracting snapshot rdb to active volume directory..."
  gunzip -c "$BACKUP_FILE" > "${REDIS_VOLUME_DIR}/dump.rdb"
  
  # 3. Start Redis
  echo "[RESTORE-REDIS] Restarting Redis container..."
  docker start "$REDIS_CONTAINER"
  echo "[RESTORE-REDIS] Restore verified."
else
  echo "[RESTORE-REDIS] Container $REDIS_CONTAINER not found. Please restore manually to active redis volume path."
  exit 1
fi
