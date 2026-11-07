# Environnement de preview Vercel

Objectif : une preview ne touche **jamais** aux données ni aux secrets de production.
La base de preview est la branche Neon `preview`, qui ne contient que le schéma et les données
de démo (pages et réglages du site, compte admin de démo). Aucun rendez-vous, aucun message.

## Comment l'API distingue preview et production

`backend/src/lib/env.ts` (`isProductionEnv`) :

- `VERCEL_ENV=preview` ou `development` : **hors production**, même si `NODE_ENV=production`
  (Vercel pose `NODE_ENV=production` aussi en preview).
- sinon, `VERCEL_ENV=production` **ou** `NODE_ENV=production` : **production** (Docker ne pose
  que `NODE_ENV`).

Au chargement de l'app (`backend/src/app.ts` → `assertRuntimeConfig`), la production refuse de
démarrer s'il manque l'une de ces variables : `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`,
`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
`S3_BUCKET`. Dans tous les environnements, `SESSION_SECRET` (32 caractères minimum) est
obligatoire : il n'existe plus de secret par défaut.

## 1. Variables à créer dans Vercel, cible **Preview uniquement**

| Variable         | Valeur                                                                                                                           | Obligatoire |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `SESSION_SECRET` | Secret propre à la preview, généré par `openssl rand -base64 48`. Jamais celui de la prod.                                       | Oui         |
| `DATABASE_URL`   | Chaîne de connexion **poolée** de la branche Neon `preview` (console Neon → branche `preview` → Connect, « Pooled connection »). | Oui         |

Rien d'autre n'est nécessaire au fonctionnement de la preview.

## 2. Variables dont il faut **retirer la cible Preview** (garder Production)

Elles pointent toutes vers la base ou le projet Neon de production :

- `DATABASE_URL` (la valeur de prod ; la nouvelle valeur Preview est créée au point 1)
- `DATABASE_URL_UNPOOLED`
- `NEON_AUTH_BASE_URL`, `NEON_PROJECT_ID`, `VITE_NEON_AUTH_URL` (non lues par le code
  aujourd'hui, mais ce sont des identifiants de prod)
- toutes les `PG*` (`PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`)
- toutes les `POSTGRES_*` (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`,
  `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`,
  `POSTGRES_URL_NO_SSL`)

Les `PG*` sont importantes : si `DATABASE_URL` venait à manquer, le client `pg` se rabattrait
sur elles et viserait la prod.

Ces variables sont gérées par l'intégration Neon ↔ Vercel : vérifier après coup qu'elle ne
remet pas la cible Preview (Vercel → Settings → Environment Variables, filtre « Preview »).

Variables de production à **ne jamais** ajouter en Preview : `ADMIN_EMAIL`, `CORS_ORIGIN`,
`S3_*`, `SMTP_*`, `SESSION_SECRET` (valeur de prod).

## 3. Secret GitHub pour les migrations de preview

| Secret GitHub Actions           | Valeur                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `PREVIEW_DATABASE_URL_UNPOOLED` | Chaîne de connexion **directe** (non poolée) de la branche Neon `preview`. Jamais la prod. |

Le job `preview-migrations` de `.github/workflows/ci.yml` applique les migrations Drizzle sur
cette branche à chaque PR, après le job `check`. Sans le secret (ou pour une PR de fork), il est
ignoré avec un avertissement.

À savoir : toutes les PR partagent la même branche `preview`. Une migration d'une PR non mergée
y reste appliquée ; en cas de conflit, réinitialiser la branche (point 4).

## 4. Initialiser une base vide (migrations + seed de démo)

Depuis la racine du dépôt, avec l'URL **directe** de la branche Neon `preview` (ou d'une
branche jetable) :

```bash
DATABASE_URL="<url directe de la branche preview>" \
ADMIN_EMAIL="demo-admin@preview.invalid" \
ADMIN_PASSWORD="$(openssl rand -base64 24)" \
pnpm --filter @coaching-life/backend db:init
```

- `db:init` = `src/db/migrate.ts` puis `src/db/seed.ts`. Idempotent (`onConflictDoNothing`).
- Le seed n'insère que les pages et réglages du site, et le compte admin de démo si
  `ADMIN_PASSWORD` est fourni. Noter ce mot de passe dans un gestionnaire, pas dans le dépôt.
- `DATABASE_URL` est obligatoire : sans elle, la commande échoue au lieu de se rabattre sur les
  `PG*` ou un `.env` local.
- Ne pas lancer cette commande avec un `.env` issu de `vercel env pull --environment=production`.

Pour repartir de zéro : dans Neon, « Reset from parent » ne convient **pas** si le parent est la
prod (cela recopierait les données réelles). Supprimer la branche `preview`, la recréer
**vide** (option schéma seul / branche sans données), puis relancer `db:init`.

## 5. Ce qui reste désactivé en preview

| Fonction       | Comportement en preview                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Envoi de mails | Transport « log » : aucun envoi ; une ligne `[mail:log]` avec le seul nom du gabarit (ni destinataire, ni sujet, ni contenu).              |
| Stockage S3/R2 | `/api/storage/*` répond `503` « Stockage de fichiers désactivé sur cet environnement ». Upload impossible, images uploadées non affichées. |
| CORS           | `CORS_ORIGIN` absent → origine par défaut `http://localhost:4200`. Sans effet : le front de preview appelle `/api` en same-origin.         |

Ajouter des variables `SMTP_*` ou `S3_*` en Preview réactiverait ces fonctions : à ne faire
qu'avec des comptes dédiés à la preview (bac à sable SMTP, bucket séparé), jamais ceux de prod.
