#!/usr/bin/env bash
set -euo pipefail

ENV=${DEPLOY_ENV:-staging}
TAG=${IMAGE_TAG:-latest}
IMAGE_NAME="ghcr.io/easydev/easydev-support-ai"
NGINX_CONF_PATH="/etc/nginx/conf.d/easydev-blue-green.conf"

echo "[DEPLOY] Beginning $ENV deployment using tag: $TAG"

# 1. Determine currently active color by checking running docker containers
if docker ps --format '{{.Names}}' | grep -q "support-ai-blue"; then
  ACTIVE_COLOR="blue"
  TARGET_COLOR="green"
  TARGET_PORT=3002
else
  ACTIVE_COLOR="green"
  TARGET_COLOR="blue"
  TARGET_PORT=3000
fi

echo "[DEPLOY] Active environment color: $ACTIVE_COLOR. Target deployment: $TARGET_COLOR on port $TARGET_PORT"

# 2. Pull latest target image
docker pull "${IMAGE_NAME}:${TAG}"

# 3. Spin up target container
echo "[DEPLOY] Bootstrapping $TARGET_COLOR container..."
docker run -d \
  --name "support-ai-${TARGET_COLOR}" \
  --network "easydev-net" \
  -p "${TARGET_PORT}:3000" \
  --env-file "./deployment/environments/${ENV}.env" \
  -e "PORT=3000" \
  "${IMAGE_NAME}:${TAG}"

# 4. Perform Health Check / Smoke Test
HEALTH_CHECK_URL="http://localhost:${TARGET_PORT}/health"
echo "[DEPLOY] Waiting for target container health check: ${HEALTH_CHECK_URL}"

SUCCESS=false
for i in {1..30}; do
  if response=$(curl -s -f "$HEALTH_CHECK_URL"); then
    status=$(echo "$response" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    if [ "$status" = "UP" ]; then
      echo "[DEPLOY] Health check passed successfully! Container is online."
      SUCCESS=true
      break
    fi
  fi
  echo "[DEPLOY] Health check attempt $i/30 failed. Retrying in 2 seconds..."
  sleep 2
done

if [ "$SUCCESS" = false ]; then
  echo "[DEPLOY] Health check failed for target environment: $TARGET_COLOR. Aborting deployment."
  docker stop "support-ai-${TARGET_COLOR}"
  docker rm "support-ai-${TARGET_COLOR}"
  exit 1
fi

# 5. Run Database Migrations
echo "[DEPLOY] Executing database migrations..."
chmod +x ./scripts/database-migrations.sh
./scripts/database-migrations.sh

# 6. Switch Traffic at Nginx Level
echo "[DEPLOY] Pointing Nginx traffic to $TARGET_COLOR..."
if [ -f "$NGINX_CONF_PATH" ]; then
  # Replace upstream port to the new target port
  sudo sed -i "s/server api:[0-9]*/server api:${TARGET_PORT}/" "$NGINX_CONF_PATH"
  sudo nginx -s reload
  echo "[DEPLOY] Nginx routing configuration reloaded."
else
  echo "[DEPLOY] Nginx configuration file not found at $NGINX_CONF_PATH. Skipping route reload."
fi

# 7. Teardown Active Container
echo "[DEPLOY] Gracefully terminating old $ACTIVE_COLOR container..."
if docker ps -a --format '{{.Names}}' | grep -q "support-ai-${ACTIVE_COLOR}"; then
  docker stop "support-ai-${ACTIVE_COLOR}"
  docker rm "support-ai-${ACTIVE_COLOR}"
fi

echo "[DEPLOY] Deployment completed successfully! $TARGET_COLOR is now live."
