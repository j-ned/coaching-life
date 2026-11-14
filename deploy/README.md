# Déploiement sur le serveur (Dokploy) et bascule depuis Vercel + Neon

La pile de production est `compose.yaml` : l'application (un processus Node qui sert le front
Angular prérendu et l'API sous `/api`) et la sauvegarde. La base Postgres 18 est **hors de la
pile** : un service de base de données de Dokploy, dans le même projet, joint par
`dokploy-network`. Dokploy ne construit rien ; il tire les images publiées sur GHCR par la CI
(`coaching-life-app`, `coaching-life-backup`). Le trafic arrive par le tunnel Cloudflare, puis le
Traefik de Dokploy. Les fichiers restent sur R2, les mails partent par le même SMTP.

Tant que l'étape « Bascule » n'est pas faite, Vercel et Neon restent la production : tout ce qui
précède est sans impact. Le dépôt garde ce qui sert à Vercel (`vercel.json`, `api/`) jusqu'à ce que
la bascule soit stable.

## Mise en place (une fois)

1. **Paquets GHCR** : après la première CI sur `master`, vérifier que `coaching-life-app` et
   `coaching-life-backup` sont lisibles par le serveur (publics, ou registre `ghcr.io` déclaré
   dans Dokploy avec un jeton `read:packages`).
2. **Bucket de sauvegarde** : bucket R2 privé (`coaching-life-backups`), jeton d'API limité à ce
   bucket, règle de cycle de vie qui supprime les objets après 30 jours par exemple.
3. **Dokploy** : dans un projet, un service **Database** PostgreSQL 18, sans port externe, mot de
   passe en hexadécimal (`openssl rand -hex 32`) ; puis un service **Compose** dont la source est
   le dépôt : fournisseur **Git**, URL `https://github.com/j-ned/coaching-life.git`, branche
   `master`, Compose Path `./deploy/compose.yaml`. **Auto Deploy désactivé** : c'est la CI qui
   déclenche. Pas de mode **Raw** : il ignorerait le dépôt.
4. **Environment** : coller `coaching-life.env.example` rempli. Les `POSTGRES_*` viennent de la
   fiche du service de base (Internal Credentials). `SESSION_SECRET`, `S3_*` et `SMTP_*` se
   reprennent **à l'identique** du projet Vercel (variables de Production).
5. **Domains** : service `coaching-life-app`, port `3000`, HTTP (le TLS est celui de Cloudflare),
   pour `coaching-life.nedellec-julien.fr`. _Preview Compose_ doit montrer les deux services sur
   `dokploy-network`.
6. **Premier déploiement** à la main (bouton Deploy) : l'application crée le schéma par ses
   migrations, puis le seed crée le compte `ADMIN_EMAIL` et le contenu initial. Vérifier depuis le
   serveur : `curl -s -H 'Host: coaching-life.nedellec-julien.fr' http://127.0.0.1/api/health`
   doit répondre `{"status":"ok",…}`.
7. **Secrets du dépôt** : `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `CF_ACCESS_CLIENT_ID`,
   `CF_ACCESS_CLIENT_SECRET` (mêmes valeurs que les autres dépôts) et `DOKPLOY_COMPOSE_ID`,
   **propre à ce service**. Variable `DEPLOY_HEALTH_URL` :
   `https://coaching-life.nedellec-julien.fr/api/health`.

**Ne pas basculer le DNS avant l'étape 6 vérifiée** : le site répondrait le 404 de Traefik.

## Adresse du visiteur et limites de débit

Derrière le tunnel, le dernier saut de `X-Forwarded-For` est le connecteur du tunnel, le même pour
tous les visiteurs. L'application lit donc l'adresse du visiteur dans `CF-Connecting-IP`
(`CLIENT_IP_HEADER`, posé par le compose) : sans cela, un visiteur qui épuise la limite de connexion
la bloquerait pour tout le monde. Cet en-tête n'est digne de confiance que si **rien d'autre que le
tunnel ne joint Traefik** : aucun port 80/443 du serveur ouvert sur Internet.

## Import des données depuis Neon

Version du serveur Neon : `SHOW server_version;` dans la console SQL de Neon. Le client du dump doit
être de version égale ou supérieure : `postgres:18-alpine` convient jusqu'à Neon 18. URL Neon
**directe** de la branche de production (sans `-pooler`) :

```bash
read -rs NEON_URL
```

```bash
(umask 077; docker run --rm -e NEON_URL="$NEON_URL" postgres:18-alpine sh -c 'pg_dump "$NEON_URL" -Fc --no-owner --no-acl' > ~/coaching-life-neon.dump; echo "code=$?")
```

Restauration par-dessus le schéma créé au premier déploiement, dans une seule transaction qui ne
laisse rien en cas d'erreur. `<db>` est le conteneur du service de base, `<app>` le conteneur
`coaching-life-app` (`docker ps`) :

```bash
docker exec -i <db> sh -c 'pg_restore --clean --if-exists --single-transaction --no-owner --no-acl --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ~/coaching-life-neon.dump; echo "code=$?"
```

```bash
docker restart <app>
```

Le redémarrage rejoue les migrations que Neon n'aurait pas, et le seed ne touche à rien d'existant.
Comparer ensuite les comptes de lignes des deux côtés (`users`, `appointments`, `messages`,
`pages`), vérifier la connexion admin, puis effacer le fichier, qui contient les données :
`shred -u ~/coaching-life-neon.dump; unset NEON_URL`.

## Bascule (coupure de quelques minutes)

1. **Geler les écritures** : Vercel → projet `coaching-life` → _Settings_ → _Domains_ → retirer
   `coaching-life.nedellec-julien.fr`. Plus rien n'écrit dans Neon.
2. Refaire l'import des données ci-dessus (dump final).
3. Cloudflare → zone `nedellec-julien.fr` → DNS : supprimer le CNAME `coaching-life` vers
   `vercel-dns`. Puis Zero Trust → tunnel du serveur → _Public Hostnames_ : ajouter
   `coaching-life.nedellec-julien.fr` vers le Traefik de Dokploy.
4. Vérifier : `https://coaching-life.nedellec-julien.fr/api/health`, les pages publiques, la
   connexion au tableau de bord, une prise de rendez-vous et un message de contact (mail reçu),
   l'envoi et l'affichage d'une image, la console du navigateur sans erreur.

Entre la suppression du CNAME et l'ajout du hostname, les résolveurs peuvent garder la réponse
« nom inexistant » jusqu'à 30 minutes (TTL négatif de la zone) : enchaîner les deux sans attendre.

## Retour arrière

Retirer le _Public Hostname_ du tunnel, recréer le CNAME vers Vercel (nuage gris) et rattacher le
domaine au projet Vercel, qui pointe toujours sur Neon. **Les écritures faites sur le serveur depuis
la bascule ne sont pas dans Neon** : si besoin, `pg_dump` de la base du serveur → `pg_restore` vers
Neon, par les mêmes commandes, sens inversé.

## Sauvegardes

Le service `coaching-life-backup` envoie chaque nuit (3 h UTC) un dump chiffré dans le bucket.
`<backup>` est son conteneur.

- Sauvegarde immédiate : `docker exec <backup> backup.sh once` (à lancer juste après l'import)
- Restauration dans une base **vide** : créer la base, puis
  `docker exec -e PGDATABASE=<base> <backup> backup.sh restore <objet>`
- La phrase `BACKUP_PASSPHRASE` se conserve aussi hors du serveur : sans elle, aucune sauvegarde ne
  se déchiffre.
- Un échec n'alerte personne : il s'écrit dans les journaux du conteneur. Regarder le bucket de
  temps en temps, et rejouer une restauration de temps à autre.

## Retour à une version

Dans Environment, fixer `APP_IMAGE=ghcr.io/j-ned/coaching-life-app:sha-<commit>`, puis Deploy. Une
migration déjà appliquée ne se défait pas ainsi : l'ancienne image doit tolérer le nouveau schéma
(expand, migrate, contract).

Un redéploiement coupe le site quelques secondes (Dokploy recrée le conteneur).

## Après une à deux semaines stables

- Supprimer le projet Vercel, puis la base Neon (garder un dernier dump), y compris sa branche
  `preview` et le secret `PREVIEW_DATABASE_URL_UNPOOLED` du dépôt.
- Retirer du dépôt ce qui ne sert qu'à Vercel : `vercel.json`, `api/`, `build:vercel`,
  `check:vercel-function`, `@vercel/functions` (`afterResponse`), la lecture de `VERCEL` /
  `VERCEL_ENV`, le job `preview-migrations` et `docs/preview-env.md`.
