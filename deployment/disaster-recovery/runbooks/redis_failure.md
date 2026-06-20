# DISASTER RECOVERY RUNBOOK: REDIS FAILURE

## Scenario 1: Redis Instance Down (BullMQ Queues Blocked)

### Step 1: Diagnose Connectivity & Logs
```bash
docker ps | grep support-ai-redis
docker logs --tail 50 support-ai-redis
redis-cli -h localhost -p 6381 ping
```

### Step 2: Restart and Load Snapshot
If container is stopped or dead:
```bash
docker start support-ai-redis
```
Verify that the dataset is loaded from AOF/RDB:
```bash
redis-cli -h localhost -p 6381 info persistence | grep loading
```

---

## Scenario 2: Data Corruption or AOF Parsing Failure on Startup

If Redis fails to start due to corrupted appendonly files:

### Step 1: Repair Append Only File
Run the redis-check-aof utility to truncate corrupted segments:
```bash
# Executed on the mapped volume data path
docker run --rm -it -v easydev-support-ai_redis-data:/data redis:8-alpine redis-check-aof --fix /data/appendonly.aof
```

### Step 2: Restore from Encrypted Backup Archive
If AOF repair fails, restore the last clean snapshot:
```bash
# Locate latest Redis snapshot backup file
LATEST_REDIS_BACKUP=$(ls -t /backups/redis/redis_raw_*.enc | head -n 1)

# Execute restore script
/bin/bash ./deployment/disaster-recovery/scripts/restore-redis.sh "$LATEST_REDIS_BACKUP"
```
Verify ping:
```bash
docker exec -it support-ai-redis redis-cli ping
```
