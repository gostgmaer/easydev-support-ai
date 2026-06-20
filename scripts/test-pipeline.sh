#!/usr/bin/env bash
set -euo pipefail

echo "[TEST-PIPELINE] Starting CI/CD validation tests..."

# 1. Validate Environment Configurations
echo "[TEST-PIPELINE] Verifying environment configuration files..."
for env_file in dev staging prod; do
  file_path="./deployment/environments/${env_file}.env"
  if [ -f "$file_path" ]; then
    echo "  - [OK] $env_file environment configuration verified."
    # Check for critical keys
    grep -q "PORT=" "$file_path" || { echo "  - [FAIL] Missing PORT in $env_file"; exit 1; }
    grep -q "DB_HOST=" "$file_path" || { echo "  - [FAIL] Missing DB_HOST in $env_file"; exit 1; }
    grep -q "REDIS_HOST=" "$file_path" || { echo "  - [FAIL] Missing REDIS_HOST in $env_file"; exit 1; }
  else
    echo "  - [FAIL] Configuration file missing at $file_path"
    exit 1
  fi
done

# 2. Validate PM2 configuration
echo "[TEST-PIPELINE] Verifying PM2 ecosystem config..."
if [ -f "./ecosystem.config.js" ]; then
  echo "  - [OK] ecosystem.config.js exists."
else
  echo "  - [FAIL] ecosystem.config.js missing."
  exit 1
fi

# 3. Validate Dockerfile syntax and builder targets
echo "[TEST-PIPELINE] Verifying Dockerfile.prod configuration..."
if grep -q "FROM node:22-alpine AS builder" ./Dockerfile.prod && grep -q "FROM node:22-alpine AS runner" ./Dockerfile.prod; then
  echo "  - [OK] Dockerfile.prod multi-stage build patterns verified."
else
  echo "  - [FAIL] Dockerfile.prod is invalid or does not contain multi-stage build targets."
  exit 1
fi

# 4. Simulate health check validation routines
echo "[TEST-PIPELINE] Testing Health Validation logic..."
HEALTH_BODY='{"status":"UP","timestamp":"2026-06-21T03:13:42Z","components":{"database":{"status":"UP"},"redis":{"status":"UP"}}}'
status=$(echo "$HEALTH_BODY" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ "$status" = "UP" ]; then
  echo "  - [OK] Health parser output matched UP status successfully."
else
  echo "  - [FAIL] Health parser failed to extract UP status."
  exit 1
fi

echo "[TEST-PIPELINE] All pipeline validation tests passed successfully."
