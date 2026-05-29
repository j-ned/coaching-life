import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Charge le .env racine du monorepo AVANT tout autre import applicatif.
// En ESM, les `import` sont évalués avant le code top-level du module importateur :
// ce module DOIT donc être importé en toute première ligne de index.ts, sinon les modules
// qui lisent process.env au chargement (session, mailer, db) voient un env vide.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
