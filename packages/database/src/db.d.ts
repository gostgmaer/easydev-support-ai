import { Pool } from 'pg';
import * as schema from './schema';
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
export type Database = typeof db;
export * as schema from './schema';
