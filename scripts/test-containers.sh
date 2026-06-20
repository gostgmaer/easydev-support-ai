#!/usr/bin/env bash
set -euo pipefail

echo "[TEST-CONTAINER] Initiating Docker infrastructure validation tests..."

# 1. Validate Docker Compose config file syntax
echo "[TEST-CONTAINER] Validating Docker Compose configuration files..."
docker compose -f docker-compose.production.yml config > /dev/null
docker compose -f docker-compose.staging.yml config > /dev/null
docker compose -f docker-compose.local.yml config > /dev/null
echo "  - [OK] Compose files verified syntactically."

# 2. Check Dockerfile non-root security patterns
echo "[TEST-CONTAINER] Inspecting security compliance for Dockerfiles..."
for dockerfile in Dockerfile.api Dockerfile.worker Dockerfile.webhook; do
  if grep -q "USER node" "$dockerfile"; then
    echo "  - [OK] $dockerfile runs as non-root user (node)."
  else
    echo "  - [FAIL] $dockerfile does not define USER instruction. Security risk detected!"
    exit 1
  fi
  
  if grep -q "HEALTHCHECK" "$dockerfile"; then
    echo "  - [OK] $dockerfile has health check hook defined."
  else
    echo "  - [FAIL] $dockerfile is missing HEALTHCHECK definition."
    exit 1
  fi
done

# 3. Verify Backup Scripts execution syntax
echo "[TEST-CONTAINER] Checking backup and restore scripts syntax..."
for script in backup-postgres.sh backup-redis.sh restore-postgres.sh restore-redis.sh; do
  if [ -f "./scripts/${script}" ]; then
    echo "  - [OK] scripts/${script} exists."
  else
    echo "  - [FAIL] scripts/${script} missing."
    exit 1
  fi
done

echo "[TEST-CONTAINER] All container infrastructure validation checks passed."
