import { randomBytes } from 'node:crypto';

// Le module db/index.ts lit DATABASE_URL à son chargement : il doit viser la base de test.
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];

// Plus aucun secret de session par défaut : la suite génère le sien si l'env n'en fournit pas.
process.env['SESSION_SECRET'] ??= randomBytes(32).toString('hex');
