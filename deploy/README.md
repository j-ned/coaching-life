# Déploiement sur le serveur (Dokploy)

La pile de production est `compose.yaml` : l'application (un processus Node qui sert le front
Angular prérendu et l'API sous `/api`) et la sauvegarde. La base Postgres 18 est **hors de la
pile** : un service de base de données de Dokploy, dans le même projet, joint par
`dokploy-network`. Dokploy ne construit rien ; il tire les images publiées sur GHCR par la CI
(`coaching-life-app`, `coaching-life-backup`). Le trafic arrive par le tunnel Cloudflare, puis le
Traefik de Dokploy. Les fichiers restent sur R2, les mails partent par l'API de Resend.

Ce dossier ne contient que ce qui concerne le serveur. Les scripts de la CI (vérification de
l'image, du compose, déclenchement de Dokploy) sont dans `.github/scripts/`.

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
   fiche du service de base (Internal Credentials). `POSTGRES_HOST` est le **nom complet** du
   service, préfixe du projet compris (`coaching-life-coaching-life-3qgacl`) : le nom court ne se
   résout pas et l'application redémarre en boucle (`getaddrinfo EAI_AGAIN`). Mail :
   `RESEND_API_KEY` et `MAIL_FROM`, une adresse sur un domaine vérifié chez Resend.
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

Le domaine passe par le tunnel Cloudflare (Zero Trust → tunnel du serveur → _Public Hostnames_),
vers le Traefik de Dokploy. Un domaine ajouté au tunnel avant que l'application réponde fait
répondre le 404 de Traefik.

## Adresse du visiteur et limites de débit

Derrière le tunnel, le dernier saut de `X-Forwarded-For` est le connecteur du tunnel, le même pour
tous les visiteurs. L'application lit donc l'adresse du visiteur dans `CF-Connecting-IP`
(`CLIENT_IP_HEADER`, posé par le compose) : sans cela, un visiteur qui épuise la limite de connexion
la bloquerait pour tout le monde. Cet en-tête n'est digne de confiance que si **rien d'autre que le
tunnel ne joint Traefik** : aucun port 80/443 du serveur ouvert sur Internet.

## Historique : bascule depuis Vercel + Neon (14 novembre 2026)

L'application tournait sur Vercel (fonction Node) avec une base Neon et des mails SMTP. La base a
été copiée par `pg_dump` / `pg_restore` (Postgres 18.7 des deux côtés, comptes de lignes comparés
table par table), après le gel des écritures, puis le DNS a été remplacé par le tunnel. Le dépôt ne
contient plus rien de Vercel ni de SMTP ; un retour en arrière passe par une image antérieure
(ci-dessous) et les sauvegardes.

## Sauvegardes

Le service `coaching-life-backup` envoie chaque nuit (3 h UTC) un dump chiffré dans le bucket.
`<backup>` est son conteneur.

- Sauvegarde immédiate : `docker exec <backup> backup.sh once`
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

## Reste à faire hors du dépôt

- Supprimer le projet Vercel `coaching-life` (ou, au minimum, le déconnecter du dépôt).
- Supprimer la base Neon après un dernier dump, branche `preview` comprise, et le secret
  `PREVIEW_DATABASE_URL_UNPOOLED` du dépôt.
