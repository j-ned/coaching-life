import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, '../db/migrations');
const rootEnvFile = resolve(here, '../../../.env');
const READY_TIMEOUT_MS = 30_000;

function requireTestDatabaseUrl(): string {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL absent : la suite d'intégration exige un PostgreSQL de test " +
        '(pnpm --filter @coaching-life/backend test:db:up, puis ' +
        'TEST_DATABASE_URL=postgres://postgres:test@localhost:54329/postgres).',
    );
  }
  const appUrls = [
    process.env['DATABASE_URL'],
    existsSync(rootEnvFile) ? parse(readFileSync(rootEnvFile))['DATABASE_URL'] : undefined,
  ];
  if (appUrls.includes(url)) {
    throw new Error('TEST_DATABASE_URL désigne la base applicative : refus de la réinitialiser.');
  }
  return url;
}

async function waitForDatabase(pool: pg.Pool): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (Date.now() > deadline) {
        throw new Error(`PostgreSQL de test injoignable après ${READY_TIMEOUT_MS / 1000} s`, {
          cause: err,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export default async function setup(): Promise<void> {
  const pool = new pg.Pool({ connectionString: requireTestDatabaseUrl(), max: 1 });
  try {
    await waitForDatabase(pool);
    await pool.query(
      'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;',
    );
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
