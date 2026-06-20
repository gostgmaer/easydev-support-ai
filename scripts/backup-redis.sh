#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/backups/redis"
REDIS_CONTAINER="support-ai-redis-1"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/redis_backup_${TIMESTAMP}.rdb.gz"

echo "[BACKUP-REDIS] Triggering Redis background save..."

if docker ps --format '{{.Names}}' | grep -q "$REDIS_CONTAINER"; then
  # 1. Trigger BGSAVE
  docker exec -t "$REDIS_CONTAINER" redis-cli BGSAVE
  
  # 2. Wait for save to complete
  echo "[BACKUP-REDIS] Waiting for save completion..."
  while docker exec -t "$REDIS_CONTAINER" redis-cli info persistence | grep -q "rdb_bgsave_in_progress:1"; do
    sleep 1
  done

  # 3. Copy dump.rdb from container and compress
  docker cp "${REDIS_CONTAINER}:/data/dump.rdb" - | gzip > "$BACKUP_FILE"
  echo "[BACKUP-REDIS] Snapshot successfully copied and saved to $BACKUP_FILE"
else
  echo "[BACKUP-REDIS] Redis container $REDIS_CONTAINER not found. Aborting backup."
  exit 1
fi

# Apply retention policy
find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
echo "[BACKUP-REDIS] Backup cleanup complete."
