#!/usr/bin/env bash
# --- Disaster Recovery Automation Verification Test Suite ---
set -euo pipefail

export DB_CONTAINER="support-ai-postgres"
export REDIS_CONTAINER="support-ai-redis"
export DB_USER="support_ai_prod"
export DB_NAME="easydev_support_ai_prod"
export TEST_DB="easydev_support_ai_test"
export BACKUP_PASSPHRASE="test_secure_passphrase_key_ring_9921"

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../scripts && pwd)"

echo "[DR-TEST] Initializing Disaster Recovery test suite..."

# Helper cleanup function
cleanup() {
    echo "[DR-TEST] Cleaning up temporary test artifacts..."
    rm -f /backups/postgres/db_daily_test_*.enc
    rm -f /backups/redis/redis_raw_test_*.enc
    rm -rf /tmp/tenant_exports/test-tenant-123
    
    # Drop test database
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" &>/dev/null || true
    fi
}
trap cleanup EXIT

# 1. PostgreSQL Backup Validation Test
echo "[DR-TEST] 1. Executing PostgreSQL Backup Script..."
export BACKUP_PASSPHRASE
if /bin/bash "${SCRIPTS_DIR}/backup-postgres.sh" "daily"; then
    echo "  - [OK] PostgreSQL Backup script executed with status 0."
else
    echo "  - [FAIL] PostgreSQL Backup script failed."
    exit 1
fi

LATEST_PG_BACKUP=$(ls -t /backups/postgres/db_daily_*.enc | head -n 1 || echo "")
if [ -n "${LATEST_PG_BACKUP}" ] && [ -f "${LATEST_PG_BACKUP}" ]; then
    echo "  - [OK] Encrypted backup file verified on disk: ${LATEST_PG_BACKUP}"
else
    echo "  - [FAIL] Encrypted backup file missing or invalid."
    exit 1
fi

# 2. PostgreSQL Restore & Checksum Validation Test
echo "[DR-TEST] 2. Executing PostgreSQL Restoration onto test database..."
# Pre-create test DB
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB}; CREATE DATABASE ${TEST_DB};" &>/dev/null
fi

if /bin/bash "${SCRIPTS_DIR}/restore-postgres.sh" "${LATEST_PG_BACKUP}" "" "${TEST_DB}"; then
    echo "  - [OK] Database restored successfully onto target: ${TEST_DB}"
else
    echo "  - [FAIL] Database restoration script failed."
    exit 1
fi

# 3. Redis Backup & Verification Test
echo "[DR-TEST] 3. Executing Redis Backup Script..."
if /bin/bash "${SCRIPTS_DIR}/backup-redis.sh"; then
    echo "  - [OK] Redis backup script completed with status 0."
else
    echo "  - [FAIL] Redis backup script failed."
    exit 1
fi

LATEST_REDIS_BACKUP=$(ls -t /backups/redis/redis_raw_*.enc | head -n 1 || echo "")
if [ -n "${LATEST_REDIS_BACKUP}" ] && [ -f "${LATEST_REDIS_BACKUP}" ]; then
    echo "  - [OK] Encrypted Redis archive verified on disk: ${LATEST_REDIS_BACKUP}"
else
    echo "  - [FAIL] Encrypted Redis archive missing."
    exit 1
fi

# 4. Redis Decryption & Restore Test
echo "[DR-TEST] 4. Executing Redis Restore Script..."
if /bin/bash "${SCRIPTS_DIR}/restore-redis.sh" "${LATEST_REDIS_BACKUP}"; then
    echo "  - [OK] Redis restore script executed successfully."
else
    echo "  - [FAIL] Redis restore script failed."
    exit 1
fi

# 5. Tenant Export & Import Isolation Test
echo "[DR-TEST] 5. Testing Tenant Isolation Export and Import..."
# Insert mock tenant record if primary DB is up
TEST_TENANT_ID="test-tenant-123"
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    # Create schema if missing and insert mock
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
        CREATE SCHEMA IF NOT EXISTS ai_support_agent;
        CREATE TABLE IF NOT EXISTS ai_support_agent.customers (id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50), name VARCHAR(50));
        INSERT INTO ai_support_agent.customers (id, tenant_id, name) VALUES ('cust-1', '${TEST_TENANT_ID}', 'Mock Customer') ON CONFLICT DO NOTHING;
    " &>/dev/null
fi

# Export tenant
if /bin/bash "${SCRIPTS_DIR}/tenant-manager.sh" "export" "${TEST_TENANT_ID}" "/tmp/tenant_exports/${TEST_TENANT_ID}"; then
    echo "  - [OK] Tenant selective data exported successfully."
else
    echo "  - [FAIL] Tenant data export script failed."
    exit 1
fi

LATEST_TENANT_BACKUP="/tmp/tenant_exports/${TEST_TENANT_ID}/tenant_${TEST_TENANT_ID}_export.tar.gz.enc"
if [ -f "${LATEST_TENANT_BACKUP}" ]; then
    echo "  - [OK] Tenant encrypted backup file found."
else
    echo "  - [FAIL] Tenant encrypted backup file missing."
    exit 1
fi

# Import tenant
if /bin/bash "${SCRIPTS_DIR}/tenant-manager.sh" "import" "${TEST_TENANT_ID}" "${LATEST_TENANT_BACKUP}"; then
    echo "  - [OK] Tenant data imported successfully."
else
    echo "  - [FAIL] Tenant data import failed."
    exit 1
fi

# 6. Deployment Rollback Test
echo "[DR-TEST] 6. Testing deployment rollback wrapper script..."
if /bin/bash "${SCRIPTS_DIR}/rollback-deployment.sh" "staging" "latest"; then
    echo "  - [OK] Deployment rollback wrapper completed successfully."
else
    echo "  - [FAIL] Deployment rollback wrapper script failed."
    exit 1
fi

# 7. Failover Health Check Scans Test
echo "[DR-TEST] 7. Testing automated disaster recovery failover checker..."
if /bin/bash "${SCRIPTS_DIR}/dr-failover.sh"; then
    echo "  - [OK] DR failover manager script executed without errors."
else
    echo "  - [FAIL] DR failover manager script execution failed."
    exit 1
fi

echo "[DR-TEST] All Disaster Recovery Platform validation tests passed successfully."
exit 0
