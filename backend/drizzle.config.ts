import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Charge le .env racine du monorepo (../ depuis backend/)
config({ path: resolve(process.cwd(), '../.env') });

const url = process.env['DATABASE_URL'];
if (!url) throw new Error("Variable d'environnement manquante : DATABASE_URL");

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
});
