# DISASTER RECOVERY RUNBOOK: SSL, STORAGE & INFRASTRUCTURE FAILURES

## Scenario 1: SSL/TLS Certificate Expiration or Corruption

### Step 1: Diagnosis
Verify certificate dates and domain resolutions:
```bash
echo | openssl s_client -connect api.easydev.in:443 -servername api.easydev.in 2>/dev/null | openssl x509 -noout -dates
```

### Step 2: Emergency Certificate Renewal
Force renew certbot verification:
```bash
# Execute the automated renew script
/bin/bash ./deployment/nginx-edge/scripts/renew-ssl.sh
```

### Step 3: Hot Reload Nginx Proxy
```bash
docker exec support-ai-nginx nginx -t
docker exec support-ai-nginx nginx -s reload
```

---

## Scenario 2: Object Storage / AWS S3 Connection Offline

### Step 1: Diagnose Access Denied / DNS Resolution issues
```bash
# Verify DNS resolution of S3 endpoint
nslookup s3.amazonaws.com
# Test credentials and basic connectivity
aws s3 ls "s3://easydev-support-ai-backups"
```

### Step 2: Local Staging Failback
During S3 disruptions, backups automatically stage locally in `/backups/postgres` and `/backups/redis`.
Increase local retention settings to keep 5 days of backups locally to prevent data loss while S3 is down:
```bash
export RETENTION_DAILY=5
# Execute backup scripts manually to ensure staging is working
./deployment/disaster-recovery/scripts/backup-postgres.sh daily
```

---

## Scenario 3: Disk Space Exhaustion on Docker Host Node

### Step 1: Diagnose Disk Space Consumption
```bash
df -h
docker system df
```

### Step 2: Purge Docker Build Cache and Unused Images
```bash
docker system prune -a --volumes -f
```

### Step 3: Run Purge script for old logs & backups
```bash
/bin/bash ./deployment/disaster-recovery/scripts/cleanup-backups.sh
```

---

## Scenario 4: Host Machine Hardware Failure / Infrastructure Crash

### Step 1: Provision Secondary standby Virtual Machine
Spin up infrastructure dependencies using the staging/production compose file.

### Step 2: Sync Backups from S3
```bash
aws s3 cp s3://easydev-support-ai-backups/backups/ /backups/ --recursive
```

### Step 3: Rebuild Stack & Restore DB and Redis
```bash
# Start Postgres & Redis containers
docker compose -f docker-compose.production.yml up -d postgres redis

# Restore Postgres
LATEST_DB=$(ls -t /backups/db_daily_*.enc | head -n 1)
./deployment/disaster-recovery/scripts/restore-postgres.sh "$LATEST_DB"

# Restore Redis
LATEST_REDIS=$(ls -t /backups/redis_raw_*.enc | head -n 1)
./deployment/disaster-recovery/scripts/restore-redis.sh "$LATEST_REDIS"

# Bootstrap application services
docker compose -f docker-compose.production.yml up -d api worker webhook nginx
```
Verify site status:
```bash
curl -s -o /dev/null -w "%{http_code}" https://api.easydev.in/health
```
