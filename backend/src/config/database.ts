import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { env } from './env.js';
import { logger } from './logger.js';

const { Pool } = pg;

export interface QueryResultRow {
  [column: string]: any;
}

export interface DbClient {
  query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
}

let pgPool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let dbInitialized = false;
let initPromise: Promise<void> | null = null;
let activeMode: 'postgres-pool' | 'pglite-postgres16' = 'pglite-postgres16';

function resolveMigrationPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'prisma/migrations/0001_init/migration.sql'),
    path.resolve(process.cwd(), 'backend/prisma/migrations/0001_init/migration.sql'),
    path.resolve(process.cwd(), '../backend/prisma/migrations/0001_init/migration.sql'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Arquivo de migration PostgreSQL (0001_init/migration.sql) não encontrado.');
}

async function canConnectExternalPostgres(): Promise<boolean> {
  if (env.NODE_ENV === 'test' || env.USE_EMBEDDED_PG === 'true') {
    return false;
  }
  const testPool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 1500,
  });
  try {
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    await testPool.end();
    return true;
  } catch {
    await testPool.end().catch(() => {});
    if (env.USE_EMBEDDED_PG === 'false') {
      throw new Error(
        `Não foi possível conectar ao PostgreSQL externo em DATABASE_URL e USE_EMBEDDED_PG=false.`
      );
    }
    return false;
  }
}

export async function initDatabase(): Promise<void> {
  if (dbInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const migrationSql = fs.readFileSync(resolveMigrationPath(), 'utf-8');
    const useExternal = await canConnectExternalPostgres();

    if (useExternal) {
      activeMode = 'postgres-pool';
      pgPool = new Pool({
        connectionString: env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
      });
      await pgPool.query(migrationSql);
      logger.info({ engine: 'PostgreSQL (pg.Pool)' }, 'Banco de dados PostgreSQL inicializado e migrado.');
    } else {
      activeMode = 'pglite-postgres16';
      if (env.NODE_ENV === 'test') {
        pgliteInstance = new PGlite();
      } else {
        const dataDir = path.resolve(process.cwd(), env.PGDATA_DIR);
        fs.mkdirSync(path.dirname(dataDir), { recursive: true });
        pgliteInstance = new PGlite(dataDir);
      }
      await pgliteInstance.waitReady;
      await pgliteInstance.exec(migrationSql);
      logger.info(
        { engine: 'PostgreSQL 16 (PGlite Embedded)', env: env.NODE_ENV },
        'Banco de dados PostgreSQL inicializado e migrado.'
      );
    }

    dbInitialized = true;
  })();

  return initPromise;
}

export function getDatabaseEngineMode(): string {
  return activeMode;
}

export const db = {
  async query<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!dbInitialized) {
      await initDatabase();
    }
    if (pgPool) {
      const res = await pgPool.query(sql, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
    }
    if (pgliteInstance) {
      const res = await pgliteInstance.query<T>(sql, params);
      return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
    }
    throw new Error('Motor PostgreSQL não inicializado.');
  },

  async queryOne<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { rows } = await this.query<T>(sql, params);
    return rows[0] ?? null;
  },

  async withTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    if (!dbInitialized) {
      await initDatabase();
    }

    if (pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const txClient: DbClient = {
          async query<R extends QueryResultRow = any>(sql: string, params: any[] = []) {
            const res = await client.query(sql, params);
            return { rows: res.rows as R[], rowCount: res.rowCount ?? res.rows.length };
          },
        };
        const result = await fn(txClient);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (pgliteInstance) {
      return pgliteInstance.transaction(async (tx) => {
        const txClient: DbClient = {
          async query<R extends QueryResultRow = any>(sql: string, params: any[] = []) {
            const res = await tx.query<R>(sql, params);
            return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
          },
        };
        return fn(txClient);
      });
    }

    throw new Error('Motor PostgreSQL não inicializado.');
  },

  async close(): Promise<void> {
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
    }
    if (pgliteInstance) {
      await pgliteInstance.close();
      pgliteInstance = null;
    }
    dbInitialized = false;
    initPromise = null;
  },
};

