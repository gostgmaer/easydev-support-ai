import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'path';
import { db } from './db';

// Applies packages/database's committed SQL migrations against DATABASE_URL.
// drizzle-kit (the CLI normally used for this) is a devDependency stripped
// from production images (see Dockerfile.api's Trivy-CVE comment), so this
// uses drizzle-orm's own runtime migrator against the same migration files
// instead - no CLI needed. Tracked via drizzle's own migrations table
// (drizzle.__drizzle_migrations), so it's safe to call on every boot: already
//-applied migrations are skipped.
//
// __dirname resolves under dist/ at runtime (this file compiles to
// packages/database/dist/migrate.js) - migrations live one level up in the
// sibling src/ directory, which the production Docker images copy alongside
// dist/ (COPY --from=builder .../packages ./packages copies the whole
// package, not just its build output).
export async function runMigrations(): Promise<void> {
  const migrationsFolder = join(__dirname, '..', 'src', 'migrations');
  await migrate(db, { migrationsFolder });
}
