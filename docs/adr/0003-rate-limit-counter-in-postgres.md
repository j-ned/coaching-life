# ADR-0003 — Compteur de limitation de débit partagé dans PostgreSQL

- Statut : accepté
- Date : 2026-11-11
- Contexte de décision : passage de l'hébergement Docker/Traefik (une instance) à Vercel (fonction serverless)

## Context

`rateLimit({ windowMs, max })` protège les endpoints publics : `POST /api/appointments` et `POST /api/messages` (5/min), `POST /api/auth/login` (10/5 min), `POST /api/analytics/visits` (30/min). Son compteur était une `Map` en mémoire du module, suffisante tant qu'une seule instance tournait derrière Traefik.

Sur Vercel, chaque instance de la fonction et chaque démarrage à froid a sa propre mémoire : la limite n'est plus effective. `POST /api/appointments` envoie en outre un email de confirmation à l'adresse saisie, ce qui rend l'endpoint utilisable pour du bombardement de mails.

Contraintes : aucun service externe nouveau ; l'API publique du middleware ne change pas (les fichiers de routes ne sont pas modifiés) ; les seuils ne changent pas.

## Decision

Le compteur vit dans la base Neon existante, table `rate_limit_hits` (migration `0003_rate_limit_hits.sql`) :

- colonnes `key`, `window_start` (`timestamptz`), `expires_at` (`timestamptz`), `count` ; clé primaire `(key, window_start)` ;
- **un seul ordre SQL par requête** : `INSERT ... ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count`. L'atomicité vient de la clé primaire, sans transaction ni verrou applicatif ;
- fenêtre fixe alignée sur l'**horloge de PostgreSQL** (multiples de `windowMs` depuis l'epoch) : toutes les instances écrivent la même ligne, sans dépendre de leur propre horloge.

Clé : empreinte SHA-256 (64 caractères, `CHECK` en base) de « méthode + route déclarée + `windowMs`/`max` + IP ». La route est le motif enregistré (`routePath` de Hono), pas le chemin demandé : le nombre de clés par IP est borné par le code. L'IP n'est pas stockée en clair.

IP du client : sur Vercel (`VERCEL=1`), `x-real-ip`, sinon le premier saut de `x-forwarded-for` ; la plateforme écrase ces en-têtes (documentation Vercel, « Request headers »). Hors Vercel (Docker derrière Traefik), comportement inchangé : dernière entrée de `x-forwarded-for`, puis adresse de la connexion.

Purge : `DELETE ... WHERE expires_at < now()` (index `rate_limit_hits_expires_at_idx`), déclenchée par le trafic limité lui-même, au plus une fois par minute et par instance, dès le premier comptage d'une instance. Elle est attendue avant de rendre la main (une fonction Vercel peut être gelée après la réponse) ; son échec est journalisé et ne refuse pas la requête.

Panne de la base pendant le comptage : **refus** (l'erreur remonte au gestionnaire central, HTTP 500). Les routes protégées ont besoin de la même base pour aboutir ; laisser passer rouvrirait spam et bourrage de mots de passe pendant la panne.

Architecture : port `RateLimitStore` (`backend/src/lib/rate-limit-store.ts`), adaptateur PostgreSQL (`backend/src/db/rate-limit-store.ts`), doublure en mémoire pour les tests unitaires (`backend/src/test/rate-limit-fakes.ts`).

## Consequences

- La limite tient quel que soit le nombre d'instances ; vérifié par un test d'intégration (40 requêtes simultanées, exactement `max` acceptées).
- Chaque requête limitée coûte un aller-retour SQL de plus (écriture d'une ligne), et un `DELETE` indexé au plus une fois par minute et par instance.
- Taille de la table : au plus une ligne par (route limitée, IP) et par fenêtre, conservée le temps de la fenêtre (5 min au plus) plus l'intervalle de purge. Si le trafic limité s'arrête, les dernières lignes restent jusqu'à la requête limitée suivante ; leur nombre ne croît pas.
- **Déploiement** : la table doit exister avant le code. Sur Vercel les migrations de production ne sont pas automatisées : `0003` s'applique à la main avant le merge. Elle ne fait que créer une table que l'ancien code ignore.
- Les routes construisant leurs limiteurs au chargement du module, le stockage se substitue par `useRateLimitStore` (état au niveau du module) : utilisé par le setup du projet de tests `unit`, jamais en production. À remplacer par une injection par fabrique de routes si les routes sont un jour reprises.
- La suite d'intégration n'est pas lancée par la CI aujourd'hui : l'atomicité n'est vérifiée que localement.
- `drizzle-kit generate` reste inutilisable en l'état (pas de snapshots, cf. ADR-0001) : le SQL de `0003` est celui que produit le générateur pour cette table, recopié à la main avec son entrée de journal.

## Alternatives considered

- **Redis / Upstash** : adapté, mais c'est un service externe de plus (compte, secret, facturation, panne supplémentaire) pour quelques écritures par minute. Écarté par décision du propriétaire.
- **Laisser passer quand la base est injoignable** : garde le site « ouvert », mais la protection disparaît exactement quand le système est dégradé, et la requête échouerait de toute façon à l'écriture suivante.
- **Fenêtre glissante ou seau à jetons** : plus précis aux frontières de fenêtre (une fenêtre fixe tolère jusqu'à 2 × `max` à cheval sur deux fenêtres, comme l'ancienne implémentation), au prix d'un état et d'un SQL plus complexes. Disproportionné ici.
- **Tâche planifiée de purge (cron Vercel)** : une pièce d'infrastructure de plus à surveiller ; la purge au fil de l'eau suffit à borner la table.
- **Clé en clair (`route|ip`)** : plus lisible en base, mais stocke des IP en clair et impose une troncature pour borner la longueur.
