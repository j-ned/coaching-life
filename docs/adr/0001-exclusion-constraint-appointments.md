# ADR-0001 — Non-chevauchement des rendez-vous garanti par une contrainte d'exclusion PostgreSQL

- Statut : accepté
- Date : 2026-10-01
- Contexte de décision : spec `specs/002-booking-server-validation.md` (constat F001 de l'audit 001)

## Context

`POST /api/appointments` est public. Il doit refuser un créneau qui chevauche un rendez-vous non annulé, **y compris quand deux requêtes arrivent en même temps**. Les colonnes `appointment_date` (`YYYY-MM-DD`) et `appointment_time` (`HH:MM`) sont en `text`, `duration` en minutes. Les durées proposées (30 et 60 min) et le pas de 30 min font qu'un RDV de 60 min peut chevaucher un créneau qui commence 30 min plus tard : une contrainte d'unicité sur (date, heure) ne suffit pas. Le backend n'a pas de couche de transaction ni de verrou aujourd'hui, et une seule instance tourne derrière Traefik.

## Decision

Le non-chevauchement est une **contrainte de la base**, ajoutée par la migration écrite à la main `0002_appointments_no_overlap.sql` :

- une fonction SQL `appointment_slot(text, text, integer) RETURNS tsrange`, `IMMUTABLE`, construite avec `make_timestamp` (IMMUTABLE) plutôt qu'avec un cast `text::timestamp` (STABLE, dépend de `DateStyle`, refusé dans une expression d'index) ; plage semi-ouverte `[)` en heure murale de Paris (`timestamp` sans fuseau) ;
- `EXCLUDE USING gist (appointment_slot(appointment_date, appointment_time, duration) WITH &&) WHERE (status <> 'cancelled')`.

L'application ne fait **aucun** `SELECT` de pré-vérification : elle tente l'`INSERT` et traduit le SQLSTATE `23P01` (lu sur `err.cause.code`, Drizzle 0.45 enveloppant les erreurs dans `DrizzleQueryError`) en `SlotTakenError`, puis en HTTP 409. La même traduction s'applique au `PATCH` de statut (réactivation d'un RDV annulé qui chevauche).

Vérifié en POC sur `postgres:18` : chevauchement refusé, adjacent, annulé et autre jour acceptés, 10 `INSERT` concurrents sur le même créneau donnent 1 ligne. Aucune extension n'est requise (`tsrange` a son opclass GiST native, `btree_gist` est inutile faute de colonne scalaire dans la contrainte).

## Consequences

- La garantie tient quelle que soit l'origine de l'écriture (route publique, admin, script, plusieurs instances) et sans transaction applicative.
- La règle de chevauchement n'a qu'une seule implémentation côté serveur : la base. Le test du cas concurrent exige un vrai PostgreSQL : suite d'intégration Vitest sur un conteneur Docker `postgres:18` (`TEST_DATABASE_URL`), qui échoue bruyamment si la base est absente.
- Drizzle ne sait pas déclarer cette contrainte : elle vit dans la migration SQL, signalée par un commentaire dans `schema.ts`. `drizzle-kit generate` n'est pas utilisable en l'état (pas de snapshots) : les migrations restent écrites à la main.
- Déploiement : la migration échoue si la prod contient déjà des chevauchements non annulés ou des valeurs date/heure non parsables. Une requête de pré-vol et un nettoyage manuel sont nécessaires avant de déployer.
- Les valeurs passées à `appointment_slot` doivent être valides : la route valide les règles métier **avant** l'`INSERT`.

## Alternatives considered

- **Pré-vérification `SELECT` + `INSERT` sans protection** : racé, c'est le bug actuel.
- **Transaction `SERIALIZABLE`** avec `SELECT` de chevauchement puis `INSERT` : correcte, mais impose une boucle de retry sur `40001`, couvre seulement les écritures qui passent par ce chemin, et garde la règle dans le code applicatif.
- **Verrou consultatif** (`pg_advisory_xact_lock(hash(date))`) dans une transaction : correct et simple, mais facultatif (toute écriture qui l'oublie contourne la règle) et toujours accompagné d'un `SELECT` applicatif.
- **Contrainte `UNIQUE (appointment_date, appointment_time)`** : ne détecte pas un chevauchement à début différent (10:00 + 60 min contre 10:30).
- **Colonne générée `tsrange` stockée** : équivalente, mais ajoute une colonne que Drizzle devrait modéliser (type personnalisé) pour aucun gain ; l'expression dans la contrainte suffit.
