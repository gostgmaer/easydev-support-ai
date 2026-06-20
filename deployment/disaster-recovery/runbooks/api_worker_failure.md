# DISASTER RECOVERY RUNBOOK: API & WORKER NODE FAILURES

## Scenario 1: API Gateway Timeout / OOM Crash Loop

### Step 1: Diagnose Container Status
Check resource consumption and identify memory spikes:
```bash
docker stats support-ai-api --no-stream
docker logs --tail 200 support-ai-api
```

### Step 2: Rollback to Stable Release
If a faulty deployment caused the OOM loop:
```bash
# Triggers active/passive rollbacks to last stable version
/bin/bash ./deployment/disaster-recovery/scripts/rollback-deployment.sh "production" "latest"
```

---

## Scenario 2: Worker Queue Backlog / BullMQ Processing Stuck

### Step 1: Inspect Queue Status
Query BullMQ dashboard or CLI metrics:
```bash
# Query active, waiting, and failed jobs inside Redis
docker exec -it support-ai-redis redis-cli keys "bull:*"
```

### Step 2: Scale Worker Replicas
Scale worker instances to absorb load spikes:
```bash
docker compose -f docker-compose.production.yml up -d --scale worker-conversation=4 --scale worker-workflow=4
```

### Step 3: Purge Stuck Jobs & Release Locks
If a toxic job blocks the queue processing:
```bash
# Execute job failure clear commands via Redis cli
docker exec -it support-ai-redis redis-cli -c "DEL bull:conversation-queue:stalled"
```
Restart workers to pick up refreshed locks:
```bash
docker compose -f docker-compose.production.yml restart worker-conversation worker-workflow
```
```bash
# Check worker logs to confirm processing resumed
docker compose -f docker-compose.production.yml logs --tail 100 worker-conversation
```
# DISASTER RECOVERY RUNBOOK: WORKER FAILURE

## Scenario: Worker Container Dead/Crashed

### Step 1: Check logs and status
```bash
docker ps -a | grep worker
docker logs --tail 100 support-ai-worker-conversation-1
```

### Step 2: Restart container
```bash
docker restart support-ai-worker-conversation-1
```
Verify status:
```bash
docker ps | grep worker
```
If crash persists, rollback configuration or image.
