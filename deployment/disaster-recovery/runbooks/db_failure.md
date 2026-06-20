# DISASTER RECOVERY RUNBOOK: DATABASE FAILURE

## Scenario 1: Primary Database Instance Offline / Unresponsive

### Step 1: Diagnosis
Verify container status and network connectivity:
```bash
docker ps -a | grep support-ai-postgres
docker logs --tail 100 support-ai-postgres
docker exec -it support-ai-postgres pg_isready -U support_ai_prod -d easydev_support_ai_prod
```

### Step 2: Automated Replica Promotion (Streaming Failover)
If primary database is dead and standby replica needs to be promoted to primary:
```bash
# Execute promotion command on replica database container
docker exec -it support-ai-postgres-replica psql -U postgres -c "SELECT pg_promote();"
```
Reconfigure Nginx upstream pointers inside `/etc/nginx/conf.d/upstreams.conf` to target the replica node.

---

## Scenario 2: Data Corruption or Human Error (PITR Recovery)

When tables are dropped or data gets corrupted, execute Point-In-Time-Recovery (PITR).

### Step 1: Locate Target Timestamp
Identify the timestamp immediately prior to the incident (e.g., `"2026-06-21 02:00:00"`).

### Step 2: Execute Restore Script with target time
Run the recovery command:
```bash
# Locate latest encrypted basebackup or snapshot
LATEST_BACKUP=$(ls -t /backups/postgres/db_daily_*.enc | head -n 1)

# Execute PITR restore
/bin/bash ./deployment/disaster-recovery/scripts/restore-postgres.sh "$LATEST_BACKUP" "2026-06-21 02:00:00"
```

### Step 3: Verify Integrity & Online Status
```bash
# Check audit logs to verify completion
psql -U support_ai_prod -d easydev_support_ai_prod -c "SELECT * FROM ai_support_agent.dr_audit_logs ORDER BY created_at DESC LIMIT 5;"
```
