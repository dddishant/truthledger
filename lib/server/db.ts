import { Pool } from 'pg';
import { getOptionalEnv } from '@/lib/server/config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = getOptionalEnv('DATABASE_URL');
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  return pool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}
