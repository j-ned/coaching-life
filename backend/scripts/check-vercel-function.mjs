// Charge la fonction Vercel telle qu'elle sera déployée (`api/index.mjs` + bundle) et vérifie
// qu'elle répond : un bundle qui ne se charge pas doit échouer ici, pas en production.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Valeurs factices : seule la validation de configuration au démarrage en a besoin.
process.env['SESSION_SECRET'] ??= 'x'.repeat(40);
process.env['DATABASE_URL'] ??= 'postgres://user:pass@127.0.0.1:5/db';

const entry = pathToFileURL(resolve(import.meta.dirname, '../../api/index.mjs')).href;
const { GET } = await import(entry);
const response = await GET(new Request('http://localhost/api/health'));

if (response.status !== 200) {
  console.error(`Fonction Vercel : /api/health a répondu ${response.status}`);
  process.exit(1);
}
console.info('Fonction Vercel : bundle chargé, /api/health → 200');
