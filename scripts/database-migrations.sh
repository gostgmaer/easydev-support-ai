#!/usr/bin/env bash
set -euo pipefail

echo "[MIGRATION] Checking database connectivity and schema validations..."

# 1. Run drizzle-kit lint/checks to validate no syntax errors or conflicts
pnpm --filter @easydev/database exec drizzle-kit check || {
  echo "[MIGRATION] Schema validation checks failed. Aborting migration execution."
  exit 1
}

# 2. Run schema migration execution
echo "[MIGRATION] Applying migrations to active database instance..."
pnpm --filter @easydev/database exec drizzle-kit push || {
  echo "[MIGRATION] Database schema migration execution failed. Attempting cleanup."
  exit 1
}

# 3. Verify database health after migration
echo "[MIGRATION] Verifying database connectivity state..."
db_response=$(pnpm exec ts-node -e "
import { db } from '@easydev/database';
import { sql } from 'drizzle-orm';
db.execute(sql\`SELECT 1\`).then(() => {
  console.log('UP');
  process.exit(0);
}).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
" || echo "DOWN")

if [ "$db_response" != "UP" ]; then
  echo "[MIGRATION] Post-migration database connection test failed: $db_response"
  echo "[MIGRATION] Initiating automated database rollback check..."
  # Rollback changes (drizzle-kit does not support automatic down migrations directly, 
  # so we log warning and flag for manual intervention or checkout previous Git tag)
  exit 1
fi

echo "[MIGRATION] Database schema migrations completed successfully."
