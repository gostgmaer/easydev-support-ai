#!/usr/bin/env bash
set -euo pipefail

ENV=${DEPLOY_ENV:-staging}
IMAGE_NAME="ghcr.io/easydev/easydev-support-ai"
NGINX_CONF_PATH="/etc/nginx/conf.d/easydev-blue-green.conf"

echo "[ROLLBACK] Initiating system rollback sequence..."

# 1. Determine currently active color
if docker ps --format '{{.Names}}' | grep -q "support-ai-blue"; then
  ACTIVE_COLOR="blue"
  ROLLBACK_COLOR="green"
  ROLLBACK_PORT=3002
else
  ACTIVE_COLOR="green"
  ROLLBACK_COLOR="blue"
  ROLLBACK_PORT=3000
fi

echo "[ROLLBACK] Active color: $ACTIVE_COLOR. Rollback target color: $ROLLBACK_COLOR on port $ROLLBACK_PORT"

# 2. Check if rollback container is running, if not, spin it up using latest stable tag
if ! docker ps --format '{{.Names}}' | grep -q "support-ai-${ROLLBACK_COLOR}"; then
  echo "[ROLLBACK] Rollback container not running. Bootstrapping fallback container..."
  docker pull "${IMAGE_NAME}:${ENV}-latest"
  docker run -d \
    --name "support-ai-${ROLLBACK_COLOR}" \
    --network "easydev-net" \
    -p "${ROLLBACK_PORT}:3000" \
    --env-file "./deployment/environments/${ENV}.env" \
    -e "PORT=3000" \
    "${IMAGE_NAME}:${ENV}-latest"
fi

# 3. Health Check validation
HEALTH_CHECK_URL="http://localhost:${ROLLBACK_PORT}/health"
echo "[ROLLBACK] Verifying rollback container health: ${HEALTH_CHECK_URL}"

SUCCESS=false
for i in {1..15}; do
  if response=$(curl -s -f "$HEALTH_CHECK_URL"); then
    status=$(echo "$response" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    if [ "$status" = "UP" ]; then
      echo "[ROLLBACK] Rollback container verified. Proceeding with routing switch."
      SUCCESS=true
      break
    fi
  fi
  sleep 2
done

if [ "$SUCCESS" = false ]; then
  echo "[ROLLBACK] Rollback destination health check failed. Aborting."
  exit 1
fi

# 4. Revert Nginx traffic
echo "[ROLLBACK] Reverting Nginx configuration routing..."
if [ -f "$NGINX_CONF_PATH" ]; then
  sudo sed -i "s/server api:[0-9]*/server api:${ROLLBACK_PORT}/" "$NGINX_CONF_PATH"
  sudo nginx -s reload
  echo "[ROLLBACK] Traffic successfully redirected."
else
  echo "[ROLLBACK] Nginx configuration file not found at $NGINX_CONF_PATH. Skipping route rollback."
fi

# 5. Terminate the failed/unstable active container
echo "[ROLLBACK] Shutting down unstable container: support-ai-${ACTIVE_COLOR}"
docker stop "support-ai-${ACTIVE_COLOR}" || true
docker rm "support-ai-${ACTIVE_COLOR}" || true

echo "[ROLLBACK] System restored to previous stable color: $ROLLBACK_COLOR"
