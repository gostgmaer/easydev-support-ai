import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const isPgBouncer = process.env.PGBOUNCER_MODE === 'true';
const slowQueryThresholdMs = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || '100',
  10,
);

// Helper to wrap pool query with slow query monitoring
const createInstrumentedPool = (
  name: string,
  connectionString: string,
): Pool => {
  const pool = new Pool({
    connectionString,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(
      process.env.DB_POOL_IDLE_TIMEOUT || '30000',
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_POOL_CONN_TIMEOUT || '2000',
      10,
    ),
  });

  const originalQuery = pool.query.bind(pool);
  pool.query = async function (this: Pool, ...args: any[]) {
    const start = Date.now();
    try {
      return await (originalQuery as any)(...args);
    } finally {
      const duration = Date.now() - start;
      if (duration > slowQueryThresholdMs) {
        console.warn(
          `[Slow Query] Database Pool: ${name} | Duration: ${duration}ms | Query: ${
            typeof args[0] === 'string'
              ? args[0].substring(0, 200)
              : args[0]?.text?.substring(0, 200)
          }...`,
        );
      }
    }
  } as any;

  return pool;
};

// Writer (Primary) Pool & DB
export const pool = createInstrumentedPool(
  'WriterPool',
  process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5434/easydev_support_ai',
);

export const db = drizzle(pool, {
  schema,
  logger: process.env.DB_QUERY_LOGGING === 'true',
});

// Reader (Replica) Pool & DB
export const readerPool = createInstrumentedPool(
  'ReaderPool',
  process.env.DATABASE_REPLICA_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5434/easydev_support_ai',
);

export const readDb = drizzle(readerPool, {
  schema,
  logger: process.env.DB_QUERY_LOGGING === 'true',
});

export type Database = typeof db;
export * as schema from './schema';
