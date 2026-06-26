#!/usr/bin/env bash
# Smoke-tests that every committed migration in packages/database/src/migrations
# applies cleanly, in journal order, to a brand-new empty Postgres database.
# Catches broken/out-of-order migrations (wrong column name, gap in the
# journal, etc.) at PR time instead of as a runtime error in some other
# environment.
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER_NAME="migration-smoke-test-$$"
DB_NAME="migration_smoke_test"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[SMOKE TEST] Starting throwaway Postgres container..."
docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB="$DB_NAME" \
  -p 127.0.0.1::5432 \
  postgres:17-alpine >/dev/null

echo "[SMOKE TEST] Waiting for Postgres to become healthy..."
READY=false
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 1
done

if [ "$READY" != true ]; then
  echo "[SMOKE TEST] Postgres never became healthy. Aborting."
  exit 1
fi

HOST_PORT="$(docker port "$CONTAINER_NAME" 5432/tcp | head -n1 | cut -d: -f2)"
if [ -z "$HOST_PORT" ]; then
  echo "[SMOKE TEST] Could not determine the mapped host port. Aborting."
  exit 1
fi

echo "[SMOKE TEST] Applying all migrations from scratch (mapped port $HOST_PORT)..."
DATABASE_URL="postgresql://postgres:postgres@localhost:${HOST_PORT}/${DB_NAME}" \
  pnpm --filter @easydev/database exec drizzle-kit migrate

echo "[SMOKE TEST] All migrations applied cleanly to a fresh database."
