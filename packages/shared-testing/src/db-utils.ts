import { pool } from '@easydev/database';

export async function cleanDatabase() {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE ai_support_agent.audit_logs CASCADE;');
    await client.query('TRUNCATE TABLE ai_support_agent.tenant_usage CASCADE;');
    await client.query('TRUNCATE TABLE ai_support_agent.tenant_limits CASCADE;');
  } catch (error) {
    console.error('Database cleanup failed:', error);
  } finally {
    client.release();
  }
}
