import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const db = drizzle(pool);

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

console.log('🗄️  Running migrations...');
await migrate(db, { migrationsFolder });
console.log('✅ Migrations applied');

await pool.end();
process.exit(0);
