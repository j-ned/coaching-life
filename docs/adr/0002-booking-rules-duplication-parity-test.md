# ADR-0002 — Règles de réservation dupliquées front/back, verrouillées par un test de parité

- Statut : accepté
- Date : 2026-10-01
- Contexte de décision : spec `specs/002-booking-server-validation.md` (constat F001 de l'audit 001)

## Context

Le serveur devient la source de vérité des règles de réservation (plage 9h–18h, pas de 30 min, durées 30/60 min, délai de prévenance de 24 h, week-ends et jours fériés, heure de Paris). Le front a besoin des mêmes règles pour afficher le calendrier et les créneaux. La spec demande, si possible, une seule source partagée.

Contraintes du workspace pnpm (`.` + `backend`) :

- le backend compile avec `tsc`, `module: NodeNext`, `rootDir: ./src`, et s'exécute en JavaScript depuis `dist/` (`node dist/index.js`, image `node:22-alpine`, dépendances aplaties par `pnpm deploy --prod --legacy`) ;
- le front compile avec l'Angular CLI (`module: preserve`, `tsconfig.app.json` avec `rootDir: ./src`) ;
- les deux utilisent des versions de TypeScript différentes (6.0 côté front, 5.9 côté backend).

Un fichier source commun importé directement casse le `rootDir` de l'un ou de l'autre. Node refuse de retirer les types d'un `.ts` situé dans `node_modules`, donc un paquet de workspace livré en sources TypeScript ne tourne pas en production.

## Decision

**Duplication contrôlée**, sans module partagé :

- côté back : `backend/src/lib/booking-rules.ts`, `french-holidays.ts`, `paris-time.ts` (API sur chaînes ISO, indépendante du fuseau du conteneur) ;
- côté front : `src/app/features/booking/domain/booking-rules.ts` (nouveau) et `src/app/shared/calendar/french-holidays.ts` (existant). Ces fichiers n'importent rien.

Chaque côté n'a qu'une définition de chaque règle. La divergence est empêchée mécaniquement par `backend/src/lib/booking-rules.parity.spec.ts`. Ce test Vitest backend importe directement les fichiers front (Vitest ne tient pas compte de `rootDir` ; `backend/tsconfig.spec.json` en `noEmit` avec `rootDir: ".."` pour le typecheck), puis compare :

- les constantes ;
- `listSlotStarts` pour chaque durée ;
- `toParisDateTime`, `bookingThreshold` (délai de prévenance de 24 h) et `isSlotTooSoon` sur des instants échantillons, bascules d'heure incluses ;
- la disponibilité de chaque jour de 2025 à 2035, raison de férié comprise.

## Consequences

- Aucun changement de build : ni Dockerfile, ni `angular.json`, ni étape de pré-build, ni boucle de dev modifiée.
- Toute modification d'une règle d'un seul côté fait échouer `pnpm --filter @coaching-life/backend test`. Le développeur doit modifier les deux fichiers, puis le test le confirme.
- Les fichiers de règles front doivent rester sans import, pour que le backend puisse les charger. Cette contrainte est écrite dans un commentaire en tête de fichier.
- Le test de parité ne protège que s'il est lancé. Il n'y a pas de CI (F007) : à brancher dans le futur workflow.

## Alternatives considered

- **Paquet de workspace compilé** (`packages/booking-rules`, `tsc` vers `dist/`, `workspace:*` des deux côtés) : c'est une vraie source unique. En contrepartie, il faut une étape de pré-build avant `ng build`, `ng test`, `pnpm typecheck` et le build backend, adapter le Dockerfile (copie du manifeste, ordre de build) et la sortie de `pnpm deploy`, sans rechargement à chaud de `ng serve`, et assumer deux versions de TypeScript pour un même paquet. C'est disproportionné pour une soixantaine de lignes stables. À reconsidérer si le volume de code partagé grandit (par exemple des schémas Zod de contrat d'API).
- **Fichier commun hors des deux `src`** importé par alias : casse `rootDir` (TS6059) des deux côtés. Côté back, il faudrait remonter `rootDir`, ce qui déplace `dist/` et casse `start.sh` et le Dockerfile.
- **Copie générée par script** au build : synchronisation implicite, fragile, et différence invisible en revue.
- **Exposer les règles par l'API** (endpoint de disponibilités calculées par le serveur) : supprime la duplication, mais change le contrat front et ajoute un aller-retour réseau par changement de mois ou de durée. C'est une refonte, hors périmètre de ce correctif.
