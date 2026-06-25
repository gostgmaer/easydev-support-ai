#!/usr/bin/env bash
# Builds and starts the full api/webhook/worker-* split locally
# (docker-compose.local.yml), runs database migrations, and leaves the stack
# running so you can manually test against it. Safe to re-run - data persists
# in the postgres-data/redis-data volumes across runs.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.local.yml"

echo "[1/4] Building api/webhook/worker images..."
$COMPOSE build

echo "[2/4] Starting postgres and redis..."
$COMPOSE up -d postgres redis

echo "Waiting for postgres to become healthy..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' easydev-support-ai-local-postgres-1 2>/dev/null)" = "healthy" ]; do
  sleep 2
done

echo "[3/4] Running database migrations..."
(
  cd packages/database
  DATABASE_URL="postgresql://postgres:postgres@localhost:5434/easydev_support_ai" \
    npx drizzle-kit migrate
)

echo "[4/4] Starting api, webhook, workers, and nginx..."
$COMPOSE up -d api webhook worker-conversation worker-workflow worker-analytics worker-connector worker-notification nginx

echo
echo "Stack is up:"
echo "  API directly:   http://localhost:3100"
echo "  Via nginx:       http://localhost:8080"
echo "  Swagger docs:    http://localhost:3100/api/docs"
echo "  Postgres:        localhost:5434 (postgres/postgres, db: easydev_support_ai)"
echo "  Redis:           localhost:6381"
echo
echo "Tear down (keeps data):   docker compose -f docker-compose.local.yml stop"
echo "Tear down (wipes data):   docker compose -f docker-compose.local.yml down -v"
