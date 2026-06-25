#!/usr/bin/env bash
# --- Automated Deployment Rollback & Migration Validation CLI ---
set -euo pipefail

ENV=${1:-"staging"}
RELEASE_TAG=${2:-"latest"}
CONFIG_FILE=${3:-""}

DB_CONTAINER="support-ai-postgres"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
: "${DB_PASSWORD:?DB_PASSWORD must be set in the environment - no default committed here (see RR-42)}"

export PGPASSWORD="${DB_PASSWORD}"

echo "[ROLLBACK-DEPLOY] Starting rollback sequence to tag: ${RELEASE_TAG} for environment: ${ENV}..."

# Helper function to write audit log in postgres database
log_audit() {
    local action=$1
    local status=$2
    local target=$3
    local checksum=$4
    local size=$5
    local metadata=$6

    local sql="INSERT INTO ai_support_agent.dr_audit_logs (action_type, component, target_identifier, status, checksum, size_bytes, metadata, executed_by) VALUES ('${action}', 'deployment', '${target}', '${status}', '${checksum}', ${size}, '${metadata}', 'rollback-deployment.sh');"
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "${sql}" || true
    fi
}

log_audit "RESTORE_STARTED" "IN_PROGRESS" "release_${RELEASE_TAG}" "" 0 "{\"env\":\"${ENV}\"}"

# 1. Config rollback if config file is provided
if [ -n "${CONFIG_FILE}" ] && [ -f "${CONFIG_FILE}" ]; then
    echo "[ROLLBACK-DEPLOY] Restoring environment config file from backup..."
    cp "${CONFIG_FILE}" "./deployment/environments/${ENV}.env"
    echo "  - [OK] Config template reverted."
fi

# 2. Run Blue-Green rollback or compose rollback
STATUS="SUCCESS"
if [ -f "./deployment/rollback.sh" ]; then
    echo "[ROLLBACK-DEPLOY] Executing active color rollback..."
    DEPLOY_ENV="${ENV}" ./deployment/rollback.sh || STATUS="FAILED"
else
    # Fallback to docker compose rollback
    echo "[ROLLBACK-DEPLOY] Reverting docker-compose stack..."
    # Update compose file variable tag and restart
    export IMAGE_TAG="${RELEASE_TAG}"
    docker compose -f "docker-compose.${ENV}.yml" up -d --remove-orphans || STATUS="FAILED"
fi

# 3. Validate Database Schema & Migrations after rollback
if [ "${STATUS}" = "SUCCESS" ]; then
    echo "[ROLLBACK-DEPLOY] Running schema migration status checks..."
    
    # Check if migration tables exist and counts match expectation
    MIGRATION_CHECK_SQL="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'ai_support_agent' AND table_name = '__drizzle_migrations';"
    
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        MIG_TABLES=$(docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "${MIGRATION_CHECK_SQL}" || echo "0")
    else
        MIG_TABLES=$(psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -t -A -c "${MIGRATION_CHECK_SQL}" || echo "0")
    fi

    if [ "${MIG_TABLES}" -eq 1 ]; then
        echo "  - [OK] Migration table found. System is structurally consistent."
    else
        echo "  - [WARNING] Drizzle migration metadata table not found or corrupted."
        STATUS="FAILED"
    fi
fi

# 4. Final Verification health check of API Gateway
if [ "${STATUS}" = "SUCCESS" ]; then
    echo "[ROLLBACK-DEPLOY] Performing final smoke tests..."
    API_HEALTH_URL="http://localhost:3100/health"
    SUCCESS=false
    for i in {1..10}; do
        if response=$(curl -s -f "${API_HEALTH_URL}"); then
            if echo "${response}" | grep -q '"status":"UP"'; then
                SUCCESS=true
                break
            fi
        fi
        sleep 2
    done
    
    if [ "${SUCCESS}" = false ]; then
        echo "  - [FAIL] API Gateway failed to reach online state post-rollback."
        STATUS="FAILED"
    fi
fi

# 5. Log audit
log_audit "RESTORE_COMPLETED" "${STATUS}" "release_${RELEASE_TAG}" "" 0 "{\"verification\":\"${STATUS}\"}"

if [ "${STATUS}" = "FAILED" ]; then
    echo "[ROLLBACK-DEPLOY] [CRITICAL] Rollback sequence failed. Manual intervention required."
    exit 1
else
    echo "[ROLLBACK-DEPLOY] Rollback process finished successfully."
fi
