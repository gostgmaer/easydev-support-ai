#!/usr/bin/env bash
# Fails if packages/database/src/schema.ts defines tables/columns with no
# corresponding committed migration. drizzle-kit generate diffs schema.ts
# against the last committed snapshot with no live database connection
# required - if it produces a new file, someone edited schema.ts and forgot
# to commit the generated migration for it.
set -euo pipefail
cd "$(dirname "$0")/.."

MIGRATIONS_DIR="packages/database/src/migrations"

# Defensive: clear any leftover untracked state from a previous failed run
# before measuring drift.
git checkout -- "$MIGRATIONS_DIR" 2>/dev/null || true
git clean -fd "$MIGRATIONS_DIR" >/dev/null 2>&1 || true

echo "[DRIFT CHECK] Diffing schema.ts against committed migrations..."
pnpm --filter @easydev/database exec drizzle-kit generate --name=ci_drift_check_tmp || true

CHANGED="$(git status --porcelain "$MIGRATIONS_DIR")"

if [ -n "$CHANGED" ]; then
  echo "[DRIFT CHECK] schema.ts has changes with no committed migration:"
  echo "$CHANGED"
  echo "[DRIFT CHECK] Run 'pnpm --filter @easydev/database exec drizzle-kit generate' locally, review the SQL, and commit it."
  git checkout -- "$MIGRATIONS_DIR" 2>/dev/null || true
  git clean -fd "$MIGRATIONS_DIR" >/dev/null 2>&1 || true
  exit 1
fi

echo "[DRIFT CHECK] No drift detected - schema.ts matches committed migrations."
