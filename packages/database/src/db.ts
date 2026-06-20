import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/easydev_support_ai',
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export * as schema from './schema';
