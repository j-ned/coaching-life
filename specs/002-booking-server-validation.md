---
type: fix
source: specs/001-intake-audit-repo.md#F001
---

# 002 — Validation serveur des réservations publiques (F001)

## Description

### Problème

`POST /api/appointments` (route publique, `backend/src/routes/appointments.ts`) insère toute réservation
conforme au schéma Zod, sans appliquer aucune des règles métier que le front impose
(`booking-calendar.ts`, `booking-time-picker.ts`). Conséquences :

- **double réservation** possible (deux requêtes concurrentes, ou une requête forgée sur un créneau déjà pris) ;
- réservation possible sur une date passée, un jour désactivé par l'admin (`disabled_dates`), un jour
  indisponible (week-end / férié selon les règles du calendrier), hors de la plage 9h–18h, ou avec une durée arbitraire ;
- chaque réservation acceptée déclenche un email de confirmation vers l'adresse saisie : un attaquant
  peut faire envoyer des emails depuis le domaine.

### Résultat attendu

1. Le serveur est la source de vérité des règles de réservation. Une réservation n'est acceptée que si :
   - la date n'est pas passée (fuseau Europe/Paris) et le début du créneau est **au moins 24 h après l'instant de la demande** (délai de prévenance) ;
   - la date n'est ni désactivée par l'admin (la désactivation ne concerne que les nouvelles réservations : les rendez-vous déjà pris ce jour-là sont conservés), ni indisponible selon les mêmes règles que le calendrier public ;
   - l'heure de début est un créneau proposé par le front (pas de 30 min, à partir de 9h) et le rendez-vous se termine au plus tard à 18h ;
   - la durée fait partie de l'ensemble fermé des durées proposées par le front ;
   - le créneau ne chevauche aucun rendez-vous non annulé (`pending`, `confirmed` et `completed` bloquent tous le créneau, seul `cancelled` le libère), **y compris en cas de requêtes concurrentes**.
2. Un refus renvoie une erreur explicite et distincte : **409** si le créneau est déjà pris, **422** (ou 400)
   pour une règle métier violée, avec un message lisible.
3. Aucun email n'est envoyé pour une réservation refusée.
4. Le front applique le même délai de prévenance : le sélecteur masque les créneaux à moins de 24 h, et le calendrier présente comme indisponible un jour sans aucun créneau réservable (aujourd'hui ; demain une fois le dernier créneau passé sous les 24 h).
5. Le front (`HttpAppointmentGateway.submitAppointment` et le parcours de réservation) affiche un message
   dédié en cas de 409 (« ce créneau vient d'être réservé, choisissez-en un autre ») et rafraîchit les créneaux occupés,
   au lieu d'un message d'erreur générique.
6. Les règles ne sont définies qu'à un seul endroit par côté. Si possible, une seule source partagée front/back
   pour les constantes (plage horaire, pas, durées) et les jours indisponibles.

### Hors périmètre

- F028 (clé de rate-limit basée sur `X-Forwarded-For`) : traité séparément.
- Double opt-in de l'email de confirmation : non demandé ici.
- Refonte visuelle du parcours de réservation.

### Critères d'acceptation

- Des tests automatisés couvrent chaque règle côté serveur (date passée, délai de prévenance de 24 h, jour désactivé, jour indisponible,
  hors plage, durée invalide, chevauchement, cas nominal) et le traitement du 409 côté front.
- Deux réservations concurrentes sur le même créneau : une seule est acceptée.
- Le parcours nominal du site reste inchangé pour l'utilisateur.

## Plan technique

> **Traces de profil** : `.claude/project-profile.md` absent, `CLAUDE.md` absent. Profil déduit du dépôt (comme l'audit 001) : pnpm 10, front `ng test` (Vitest via `@angular/build:unit-test`, découverte limitée à `src/`), modèles en `type` à champs `readonly`, ports `abstract class` + adaptateurs HTTP, backend Hono/Drizzle/Zod sans test.
> - profil absent : immutabilité stricte non vérifiée (on suit la convention observée : `readonly` partout, pas de mutation d'état partagé)
> - profil absent : convention de nommage backend non vérifiée (on suit l'existant : `routes/`, `lib/`, `db/`, fichiers en kebab-case, imports `.js` NodeNext)
> - profil absent : pas de commande lint, pas de score de mutation
>
> Décisions structurantes : **cf. ADR-0001** (contrainte d'exclusion PostgreSQL) et **cf. ADR-0002** (règles dupliquées front/back sous test de parité).

### 1. Architecture

```
POST /api/appointments
  │ rateLimit (instancié par la factory)          → 429 (inchangé)
  │ zValidator(createAppointmentSchema)          → 400 forme (inchangé)
  ▼
checkBookingRules(request, now())                    [lib/booking-rules.ts, PUR]
  │ violation                                     → 422 { error, code }   (aucun email)
  ▼
bookings.isDateDisabled(date)                     [db/booking-repository.ts]
  │ true                                          → 422 { error, code: 'disabled_date' }
  ▼
bookings.insert(data)
  │ PostgreSQL EXCLUDE appointments_no_overlap → 23P01 → SlotTakenError
  │                                               → 409 { error, code: 'slot_taken' } (aucun email)
  ▼
notifier.appointmentBooked(data)  (fire & forget, APRÈS l'insert réussi uniquement)
  → 201 { success: true, message } (inchangé)
```

- **Source de vérité du chevauchement = la base** (cf. ADR-0001). Aucun `SELECT` de pré-vérification : il serait racé et doublerait la règle. Pas de transaction applicative : l'`INSERT` seul est atomique face à la contrainte ; la course « admin désactive un jour pendant qu'un visiteur réserve » est acceptée (fenêtre de quelques ms, sans enjeu de sécurité).
- **Testabilité sans DB** : la route devient une factory `createAppointmentRoutes(deps)` ; `deps` = `{ bookings: BookingRepository; notifier: BookingNotifier; now: () => Date }`. Le fichier continue d'exporter `appointmentRoutes = createAppointmentRoutes(defaultDeps)` : `backend/src/index.ts` **n'est pas modifié**. Le `rateLimit` de la soumission est créé **dans** la factory (sinon l'instance module-level partagée renvoie 429 dès le 6e test, toutes les requêtes de test ayant l'IP `unknown`). Les autres handlers (`/booked`, admin) gardent l'accès `db` direct.
- **Front** : `HttpAppointmentGateway.submitAppointment` traduit 409/422/autre en `AppointmentSubmission` discriminée ; `Booking` (page) réagit à `reason: 'slot-taken'` : message dédié, créneau désélectionné, date conservée, rechargement des créneaux occupés du mois de la date. `BookingTimePicker` consomme les règles front (`booking-rules.ts`) au lieu de ses constantes en dur, et masque les créneaux à moins de 24 h (aligné sur le refus serveur `too_soon`). `BookingCalendar` traite un jour sans aucun créneau réservable comme indisponible (raison « Délai de prévenance de 24 h »).
- Pas de feature view-heavy ici : la dérivation des créneaux sort en **fonctions pures** (`listSlotStarts`, `bookingThreshold`, `isSlotTooSoon`, `hasBookableSlot`), pas en presenter (un seul consommateur, indirection inutile).

### 2. Fichiers à créer / modifier

**Backend (`backend/`)**

| Fichier | Action | Rôle |
| --- | --- | --- |
| `package.json` | modifier | devDep `vitest` (`^4.1.0`, même version que la racine) ; scripts `test` (`vitest run --project unit`), `test:integration` (`vitest run --project integration`), `test:db:up` / `test:db:down` (cf. § Tests DB), `typecheck` (`tsc -p tsconfig.spec.json --noEmit`) |
| `vitest.config.ts` | créer | `test.projects` : `unit` (`src/**/*.spec.ts` hors `*.integration.spec.ts`, env `node`) et `integration` (`src/**/*.integration.spec.ts`, `globalSetup`, `fileParallelism: false`). Imports explicites depuis `vitest` (pas de globals) |
| `tsconfig.json` | modifier | `exclude` += `src/**/*.spec.ts`, `src/test/**` (les tests ne partent pas dans `dist/`) |
| `tsconfig.spec.json` | créer | étend `tsconfig.json`, `noEmit`, `rootDir: ".."` (le test de parité importe des fichiers de `../src/app`), include `src/**/*.ts` |
| `src/lib/paris-time.ts` | créer | `toParisDateTime(instant: Date): ParisDateTime` (`{ date: 'YYYY-MM-DD'; minutes: number }`) via `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', hourCycle: 'h23', … }).formatToParts` |
| `src/lib/french-holidays.ts` | créer | copie contrôlée du calcul des fériés (cf. ADR-0002), API sur chaîne ISO et **UTC-safe** : `getUnavailableDayReason(isoDate): string \| null` (férié ou week-end via `Date.UTC(...).getUTCDay()`) |
| `src/lib/booking-rules.ts` | créer | constantes `BOOKING_OPENING_HOUR = 9`, `BOOKING_CLOSING_HOUR = 18`, `BOOKING_SLOT_STEP_MINUTES = 30`, `BOOKING_DURATIONS = [30, 60] as const` ; `BOOKING_LEAD_TIME_MS = 24 * 60 * 60 * 1000` ; `listSlotStarts(duration)` ; `bookingThreshold(now)` ; `isSlotTooSoon(date, time, threshold)` ; `checkBookingRules(request, now: Date): BookingRuleResult` ; `BOOKING_RULE_MESSAGES` (code → message FR) |
| `src/lib/booking-rules.spec.ts` | créer (qa) | règles pures, horloge injectée |
| `src/lib/paris-time.spec.ts` | créer (qa) | conversions dont bascules DST |
| `src/lib/booking-rules.parity.spec.ts` | créer (qa) | parité front/back (cf. ADR-0002) |
| `src/db/booking-repository.ts` | créer | port `BookingRepository` + `SlotTakenError` + `createBookingRepository(db)` (Drizzle) + `isExclusionViolation(err)` |
| `src/lib/booking-notifier.ts` | créer | port `BookingNotifier` + `mailBookingNotifier` (appelle `sendAppointmentConfirmation` + `notifyAdminNewAppointment`, comportement actuel) |
| `src/routes/appointments.ts` | modifier | factory `createAppointmentRoutes(deps)` ; POST réécrit selon § 1 ; PATCH `/:id/status` → 409 sur `isExclusionViolation` |
| `src/routes/appointments.spec.ts` | créer (qa) | route via `app.request()` + doublures in-memory |
| `src/test/booking-fakes.ts` | créer (qa) | `InMemoryBookingRepository`, `SpyBookingNotifier`, horloge fixe, builder de requête valide |
| `src/db/migrations/0002_appointments_no_overlap.sql` | créer | fonction SQL + contrainte d'exclusion (cf. § 3) |
| `src/db/migrations/meta/_journal.json` | modifier | entrée `idx: 2`, `tag: "0002_appointments_no_overlap"`, `when` > `1748563200000` (migrations écrites à la main, pas de snapshots : **ne pas** lancer `drizzle-kit generate`, qui régénérerait tout le schéma) |
| `src/db/schema.ts` | modifier | commentaire au-dessus de `appointments` signalant la contrainte `appointments_no_overlap` portée par la migration 0002 (Drizzle ne sait pas la déclarer) |
| `src/test/integration-global-setup.ts` | créer (qa) | reset du schéma de la DB de test + `migrate()` (cf. § Tests DB) |
| `src/db/booking-repository.integration.spec.ts` | créer (qa) | sémantique de la contrainte + concurrence, sur vrai PostgreSQL |
| `src/routes/appointments.integration.spec.ts` | créer (qa) | 2 POST concurrents → `[201, 409]` ; PATCH réactivation → 409 |

**Front (`src/app/`)**

| Fichier | Action | Rôle |
| --- | --- | --- |
| `features/booking/domain/booking-rules.ts` | créer | jumeau front : mêmes constantes, `listSlotStarts`, `toParisDateTime`, `bookingThreshold`, `isSlotTooSoon`, `hasBookableSlot(date, threshold)`, type `BookingDuration`. **Aucun import** (contrainte d'importabilité par le test de parité backend) |
| `features/booking/domain/booking-rules.spec.ts` | créer (qa) | |
| `features/booking/domain/models/appointment.model.ts` | modifier | `AppointmentSubmission` → union discriminée ; `AppointmentFormData.duration: BookingDuration` |
| `features/booking/infra/http-appointment.gateway.ts` | modifier | `submitAppointment` : mapping 409 / 422 / autre |
| `features/booking/infra/http-appointment.gateway.spec.ts` | modifier (qa) | cas 409, 422, 500 |
| `features/booking/components/booking-time-picker.ts` | modifier | consomme `booking-rules.ts` (boutons de durée générés depuis `BOOKING_DURATIONS`, libellés `30 min` / `1h` inchangés), filtre `isSlotTooSoon` |
| `features/booking/components/booking-calendar.ts` | modifier | jour `!hasBookableSlot(date, bookingThreshold(new Date()))` → `isDisabled`, `disabledReason` « Délai de prévenance de 24 h » (priorité : raison admin > férié/week-end > prévenance). `isPast` inchangé |
| `features/booking/pages/booking.ts` | modifier | branche `slot-taken` dans `onFormSubmitted` |
| `features/booking/pages/booking.spec.ts` | créer (qa) | premier test de composant du dépôt : succès inchangé + 409 |
| `features/booking/domain/use-cases/submit-appointment.use-case.spec.ts` | modifier (qa) | fixture d'échec conforme à la nouvelle union (`reason`) |
| `shared/calendar/french-holidays.ts` | inchangé | reste la source front des fériés (calendrier public + dashboard) ; référencé par le test de parité |

### 3. Modèles de données

**Contrainte en base** (migration 0002, validée en POC sur `postgres:18` ; aucune extension requise, `tsrange` a son opclass GiST native) :

```sql
CREATE FUNCTION appointment_slot(d text, t text, dur integer) RETURNS tsrange
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT tsrange(make_timestamp(split_part(d,'-',1)::int, split_part(d,'-',2)::int, split_part(d,'-',3)::int,
                                split_part(t,':',1)::int, split_part(t,':',2)::int, 0),
                 make_timestamp(/* idem */) + make_interval(mins => dur), '[)') $$;
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (appointment_slot(appointment_date, appointment_time, duration) WITH &&)
  WHERE (status <> 'cancelled');
```

- `make_timestamp` plutôt qu'un cast `text::timestamp` : le cast dépend de `DateStyle` (STABLE) et serait refusé dans une expression d'index ; `make_timestamp` est IMMUTABLE (vérifié : `provolatile = 'i'`).
- `timestamp` **sans** fuseau : heure murale de Paris. Le chevauchement se compare sur une même journée ; les bascules DST tombent un dimanche à 2h/3h, hors plage et jour refusé.
- `[)` : un RDV 10:00–11:00 et un 11:00–11:30 sont adjacents, **acceptés** (POC vérifié), comme le front (`slotStart < bookedEnd && slotEnd > bookedStart`).

**Backend, types** (`type`, champs `readonly`) :

```ts
type ParisDateTime = { readonly date: string; readonly minutes: number };
type BookingDuration = (typeof BOOKING_DURATIONS)[number];            // 30 | 60
type BookingRuleViolation =
  | 'invalid_date' | 'past_date' | 'unavailable_day'
  | 'invalid_duration' | 'invalid_slot' | 'too_soon' | 'disabled_date';
type BookingRuleResult =
  | { readonly ok: true; readonly duration: BookingDuration }
  | { readonly ok: false; readonly code: BookingRuleViolation; readonly message: string };
type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
```

- `checkBookingRules(request: Pick<CreateAppointmentInput, 'appointment_date' | 'appointment_time' | 'duration'>, now: Date)` (instant absolu injecté ; calcule `today = toParisDateTime(now)` et `threshold = bookingThreshold(now)`) renvoie la **première** violation dans cet ordre : `invalid_date` (date non calendaire, ex. `2026-02-30`, test aller-retour `Date.UTC`) → `past_date` (`date < today.date`, comparaison lexicale ISO : date strictement passée) → `unavailable_day` (week-end/férié) → `invalid_duration` (∉ `BOOKING_DURATIONS`) → `invalid_slot` (`time ∉ listSlotStarts(duration)` : couvre pas de 30 min, avant 9h, fin > 18h, heure malformée `25:99`) → `too_soon` (`isSlotTooSoon(date, time, threshold)`). `disabled_date` est vérifié **après**, par la route (requête DB), seulement si les règles pures passent. L'ordre garantit aussi que `appointment_slot()` ne reçoit jamais de valeur invalide.
- **Délai de prévenance (calcul)** : `bookingThreshold(now: Date): ParisDateTime = toParisDateTime(new Date(now.getTime() + BOOKING_LEAD_TIME_MS))`, soit l'instant absolu `now + 24 h` converti **ensuite** en heure murale de Paris. `isSlotTooSoon(date, time, threshold)` ⇔ `(date, startMinutes) < (threshold.date, threshold.minutes)` en ordre lexicographique (date ISO, puis minutes). Ajouter 24 h à l'instant avant de convertir gère le changement d'heure. L'ordre de l'heure murale n'est ambigu que pendant l'heure rejouée du passage à l'heure d'hiver (02:00–03:00 un dimanche), hors plage et sur un jour refusé. Pas de « date > today » ni d'addition de 24 h sur l'horloge murale. `hasBookableSlot(date, threshold)` ⇔ il existe une durée `d` et un début de `listSlotStarts(d)` non `isSlotTooSoon` (en pratique : `17:30` en 30 min n'est pas trop tôt).
- `listSlotStarts(duration)` : `09:00`, `09:30`, … tant que `start + duration <= 18:00` (60 min → `09:00`…`17:00`, 17 créneaux ; 30 min → `09:00`…`17:30`, 18 créneaux ; même algorithme que `booking-time-picker.ts`).
- Durée : ensemble fermé contrôlé par `checkBookingRules` (422), **pas** par Zod (400), pour garder un contrat uniforme « règle métier → 422 ». Le type `BookingDuration` sert la compile-time côté front (le picker ne peut émettre que 30 ou 60).
- `BookingRepository` : `{ readonly isDateDisabled: (date: string) => Promise<boolean>; readonly insert: (data: CreateAppointmentInput) => Promise<void> }` ; `insert` rejette `SlotTakenError` quand `isExclusionViolation(err)`. **Footgun Drizzle 0.45** : les erreurs de requête sont enveloppées dans `DrizzleQueryError` ; le code SQLSTATE `23P01` est sur `err.cause.code`, pas sur `err.code`. `isExclusionViolation` teste les deux.
- `BookingNotifier` : `{ readonly appointmentBooked: (data: CreateAppointmentInput) => Promise<void> }`.

**Contrat HTTP** (convention existante `{ error: <message FR> }` conservée, `code` ajouté pour la machine) :

| Statut | Corps | Cas |
| --- | --- | --- |
| 201 | `{ success: true, message: 'Votre rendez-vous a été réservé avec succès !' }` | inchangé |
| 400 | réponse `zValidator` | forme invalide (inchangé) |
| 409 | `{ error: "Ce créneau vient d'être réservé, choisissez-en un autre.", code: 'slot_taken' }` | chevauchement |
| 422 | `{ error: BOOKING_RULE_MESSAGES[code], code: BookingRuleViolation }` | règle métier |
| 429 | inchangé | rate-limit |

Messages 422 (FR, lisibles) : `invalid_date` « Date invalide. » ; `past_date` « Cette date est passée. » ; `unavailable_day` « Ce jour n'est pas ouvert à la réservation. » ; `disabled_date` « Ce jour n'est pas disponible à la réservation. » ; `invalid_duration` « Cette durée de rendez-vous n'est pas proposée. » ; `invalid_slot` « Cet horaire n'est pas proposé. » ; `too_soon` « Les rendez-vous doivent être pris au moins 24 h à l'avance. »

**Front, types** :

```ts
type AppointmentSubmission =
  | { readonly success: true; readonly message: string }
  | { readonly success: false; readonly reason: 'slot-taken' | 'rejected' | 'error'; readonly message: string };
```

Mapping dans le gateway : `HttpErrorResponse` 409 → `slot-taken` + message **front** constant « Ce créneau vient d'être réservé, choisissez-en un autre. » ; 422 → `rejected` + `err.error.error` si c'est une `string` (garde de type, sinon message générique actuel) ; tout le reste → `error` + message générique actuel (inchangé). Le template de `Booking` lit `.success` / `.message`, présents dans les deux branches : pas de changement de template.

### 4. Réactivité

Inchangée côté front : signals locaux de `Booking` (`selectedDate`, `selectedSlot`, `bookedSlots`, `submissionMessage`). Sur `slot-taken` : `submissionMessage.set(result)`, `selectedSlot.set(null)` (le formulaire disparaît), `selectedDate` conservée, `loadBookedSlots(date.substring(0, 7))`. `formRef.resetForm()` **n'est pas** appelé (l'utilisateur garde sa saisie s'il choisit un autre créneau : le `BookingForm` est détruit par le `@if`, donc la saisie est perdue de toute façon ; accepté, refonte hors périmètre). Le picker et le calendrier lisent `bookingThreshold(new Date())` dans leur `computed` (non réactif au temps : acceptable, le serveur reste l'arbitre). Aucun RxJS ajouté.

### 5. État partagé & coordination

- **Signals locaux** (front) : aucun store, aucune facade nouvelle ; seuil de partage non atteint.
- **Gateway / port** (backend) : `BookingRepository` est la frontière DB de la soumission (valide au bord par la contrainte, doublable en mémoire) ; `BookingNotifier` la frontière SMTP. Ni l'un ni l'autre ne porte d'état. La route coordonne (rôle de facade côté serveur, pas de suffixe `Store`).
- **Gateway front** : `HttpAppointmentGateway` reste le seul point HTTP ; la traduction des statuts y vit, pas dans le composant.

### 6. Cross-platform

N/A (web uniquement, aucune cible native).

### 7. Choix de bibliothèques

- **Vitest** dans `backend/` : déjà le runner du front (`vitest@4.1.0` dans le lockfile), même API, aucun nouvel outil. `app.request()` de Hono pour tester la route sans serveur ni port.
- **Pas** de `testcontainers` ni de `pg-mem`/PGlite : `pg-mem` ne supporte pas `EXCLUDE USING gist`, et le cas concurrent exige de vraies connexions parallèles. Un PostgreSQL réel via Docker (`postgres:18` déjà présent localement) suffit, piloté par deux scripts.
- Aucune dépendance runtime ajoutée ; aucune extension PostgreSQL (`btree_gist` inutile).

### Tests DB (stratégie du cas concurrent)

- Environnement constaté : pas de `psql`/PostgreSQL installé, mais **Docker opérationnel avec l'image `postgres:18`**. POC réalisé : contrainte créée, chevauchement → `23P01`, adjacent / annulé / autre jour acceptés, **10 `INSERT` concurrents sur le même créneau → 1 ligne**.
- Scripts `backend/package.json` : `test:db:up` = `docker run --rm -d --name coaching-life-test-db -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:18` ; `test:db:down` = `docker rm -f coaching-life-test-db`.
- `integration-global-setup.ts` : exige `TEST_DATABASE_URL` et **échoue bruyamment** s'il est absent (pas de `skip` silencieux qui ferait passer le critère « concurrence » pour vert) ; refuse de tourner si `TEST_DATABASE_URL === DATABASE_URL` ; attend `pg_isready` par tentative de connexion (≤ 30 s) ; `DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;` puis `migrate(drizzle(pool), { migrationsFolder: 'src/db/migrations' })`. Chaque test : `TRUNCATE appointments, disabled_dates`.
- Concurrence : `Promise.all` de 10 `repository.insert(mêmeCréneau)` sur un `Pool` `max: 10` (vraies connexions parallèles) → exactement 1 résolu, 9 `SlotTakenError` ; puis 2 `app.request(POST)` concurrents → statuts triés `[201, 409]`, notifier appelé 1 fois.
- Pas de CI (F007) : l'intégration se lance à la main. Si Docker est indisponible sur un poste, la suite d'intégration **échoue** avec un message explicite ; la garantie reste portée par la contrainte, vérifiable par la requête de pré-vol (§ 8).

### Tranches

Commandes (depuis la racine du worktree) :
- `BU` = `pnpm --filter @coaching-life/backend test`
- `BI` = `pnpm --filter @coaching-life/backend test:db:up && TEST_DATABASE_URL=postgres://postgres:test@localhost:54329/postgres pnpm --filter @coaching-life/backend test:integration`
- `BT` = `pnpm --filter @coaching-life/backend typecheck && pnpm --filter @coaching-life/backend build`
- `FU <chemin>` = `pnpm ng test --watch=false --include=<chemin>` ; gate complète front : `pnpm test --watch=false && pnpm typecheck`

- **Tranche 1 — réservation nominale acceptée, infra de test backend** : `vitest.config.ts`, tsconfigs, scripts ; factory `createAppointmentRoutes(deps)` (rate-limit instancié dedans), ports `BookingRepository` / `BookingNotifier` + impl par défaut (insert Drizzle sans mapping d'erreur encore), `toParisDateTime`, `checkBookingRules` réduit à `{ ok: true }`. Tests : POST valide (horloge fixe `2026-10-01T08:00Z`, RDV `2026-10-05` 10:00, lundi, plus de 24 h après : reste valide après les tranches 2 et 3) → 201 + corps inchangé, `insert` appelé 1 fois avec la donnée, notifier appelé 1 fois ; `toParisDateTime` (ex. `2026-03-29T00:30Z` → `2026-03-29`, 90 ; `2026-03-29T01:30Z` → `2026-03-29`, 210 (passage à l'heure d'été) ; `2026-10-31T23:30Z` → `2026-11-01`, 30 ; `2026-07-01T07:00Z` → `2026-07-01`, 540). Commande : `BU`, puis `BT`.
- **Tranche 2 — règles de calendrier (422)** : `french-holidays.ts` backend, `checkBookingRules` : `invalid_date`, `past_date`, `unavailable_day` ; route : `isDateDisabled` → `disabled_date`. Tests purs + route : 422, `code`, `error` FR, `insert` **et** notifier non appelés ; la date d'aujourd'hui (Paris) n'est **pas** `past_date` (assertion sur le code renvoyé par `checkBookingRules`, pas sur un 201, que la tranche 3 transformera en `too_soon`) ; horloge fixe `2026-10-01T08:00Z` (jeudi, 10:00 à Paris) ; ex. `2026-12-25` (vendredi férié), `2026-10-03` (samedi), `2027-05-06` (Ascension, jeudi) → `unavailable_day` ; `2026-09-30` → `past_date` ; `2026-02-30` → `invalid_date`. Commande : `BU`.
- **Tranche 3 — règles horaires et délai de prévenance (422)** : `invalid_duration`, `invalid_slot`, `too_soon` + `listSlotStarts`, `bookingThreshold`, `isSlotTooSoon`. Tests (horloge `2026-10-01T08:00Z`, soit jeudi 10:00 à Paris ; seuil = vendredi `2026-10-02` 10:00) : 45 min, `09:15`, `08:30`, `17:30` en 60 min (fin 18:30), `17:30` en 30 min accepté, `25:99` ; `too_soon` pour `2026-10-01` 17:00 (aujourd'hui) et `2026-10-02` 09:30 (23 h 30) ; `2026-10-02` 10:00 **accepté** (exactement 24 h : borne incluse côté acceptation) ; `bookingThreshold` sur instants DST : `2026-10-24T22:30Z` → `2026-10-25`, 1410 (23:30, et non 00:30 le 26 comme le donnerait « +24 h d'horloge murale ») ; `2026-03-28T22:30Z` → `2026-03-30`, 30 ; aucun email. Commande : `BU`.
- **Tranche 4 — créneau pris (409), contrat** : `SlotTakenError`, route → 409 `{ error, code: 'slot_taken' }`, notifier non appelé ; doublure in-memory qui rejette sur chevauchement. Commande : `BU`.
- **Tranche 5 — chevauchement garanti en base, y compris concurrent** : migration 0002 + journal, `isExclusionViolation` (`err.code` / `err.cause.code`), mapping dans `createBookingRepository`, PATCH `/:id/status` → 409 sur violation (réactivation d'un RDV annulé qui chevauche). Tests d'intégration : chevauchement partiel/inclus → `SlotTakenError` ; adjacent, annulé, autre jour acceptés ; concurrence (10 inserts → 1 ; 2 POST → `[201, 409]`) ; PATCH → 409. Commande : `BI`, puis `BU` et `BT`.
- **Tranche 6 — règles front alignées et parité** : `features/booking/domain/booking-rules.ts`, picker branché dessus + masquage des créneaux `isSlotTooSoon`, calendrier : jour sans créneau réservable (`hasBookableSlot` faux) → indisponible (aujourd'hui ; demain dès que 17:30 passe sous les 24 h), `AppointmentFormData.duration: BookingDuration` ; `booking-rules.parity.spec.ts` (backend) : constantes et `BOOKING_DURATIONS` égaux, `listSlotStarts(d)` égal pour chaque durée, `toParisDateTime` et `bookingThreshold` égaux sur un échantillon d'instants (dont DST), `isSlotTooSoon` égal pour chaque créneau de chaque durée sur 3 jours autour du seuil pour ces instants, et pour **chaque jour de 2025 à 2035** `getUnavailableReason(new Date(y, m-1, d), getFrenchHolidays(y)) !== null` (front) ⇔ `getUnavailableDayReason(iso) !== null` (back), raisons de férié égales. Commandes : `FU src/app/features/booking/domain/booking-rules.spec.ts`, `BU`, puis gate front complète.
- **Tranche 7 — 409 consommé par le front** : union `AppointmentSubmission`, mapping du gateway, branche `slot-taken` de `Booking`. Tests : gateway (409 → `slot-taken` + message dédié ; 422 avec corps → `rejected` + message serveur ; 422 sans corps / 500 / erreur réseau → `error` + message générique) ; `booking.spec.ts` : succès inchangé (message succès, sélection remise à zéro) et 409 (message dédié affiché, formulaire absent, `getBookedSlots` rappelé avec le mois de la date sélectionnée, picker toujours affiché). Harnais : `deferBlockBehavior: DeferBlockBehavior.Manual` puis `(await fixture.getDeferBlocks())[0].render(DeferBlockState.Complete)` (le `@defer (on viewport)` ne se déclenche jamais sous jsdom) ; `AppointmentGateway` fourni en doublure ; sélection pilotée par les `output` des enfants (`selectedDateChange`, `slotSelected`, `formSubmitted`), assertions sur le DOM rendu. Commandes : `FU src/app/features/booking/infra/http-appointment.gateway.spec.ts`, `FU src/app/features/booking/pages/booking.spec.ts`, puis gate front complète.

### 8. Risques & inconnues

- **Déploiement** : la migration 0002 échoue (et `start.sh`, en `set -e`, bloque le démarrage) si la prod contient déjà des RDV non annulés qui se chevauchent ou des valeurs non parsables par `appointment_slot` (requêtes forgées passées). Exécuter avant déploiement une requête de pré-vol (doublons via auto-jointure sur la plage ; lignes ne respectant pas `^\d{4}-\d{2}-\d{2}$` / `^\d{2}:\d{2}$`) et nettoyer à la main ; vérifier aussi que `Intl` avec `timeZone: 'Europe/Paris'` fonctionne dans `node:22-alpine` (ICU complet attendu).
- **Hypothèses domaine validées par l'utilisateur le 2026-10-01** : délai de prévenance de 24 h minimum, mesuré entre instants absolus (`too_soon`) ; `pending` / `confirmed` / `completed` bloquent tous le créneau, seul `cancelled` le libère ; un jour désactivé par l'admin ne s'applique qu'aux nouvelles réservations (les RDV existants ce jour-là sont conservés). Le délai de 24 h s'applique à tous les types de coaching (validé par l'utilisateur le 2026-10-01).
- **Hors périmètre, à garder en tête** : F003 (`getBookedSlots` avale les erreurs : après un 409, un échec du rechargement laisse une liste vide et donc des créneaux pris affichés libres, le serveur refusera de nouveau en 409) ; F023 (pas d'`aria-live` sur le message) ; F028 (rate-limit contournable).

## Plan de test

### Tranche 1 — réservation nominale acceptée, infra de test backend

Outillage de test posé (qa) : devDep `vitest@^4.1.0` dans `backend/package.json`, scripts `test` (`vitest run --project unit`) et `typecheck` (`tsc -p tsconfig.spec.json --noEmit`), `backend/vitest.config.ts` (projet `unit` seul ; le projet `integration` et les scripts `test:integration` / `test:db:*` arrivent en tranche 5), `backend/tsconfig.spec.json`, `exclude` des specs et de `src/test/**` dans `backend/tsconfig.json`. Doublures : `backend/src/test/booking-fakes.ts` (`FIXED_NOW` = `2026-10-01T08:00Z`, `fixedClock`, `aBookingRequest`, `InMemoryBookingRepository`, `SpyBookingNotifier`, `postBooking`). Le type d'entrée est dérivé du port (`Parameters<BookingRepository['insert']>[0]`), sans présumer du module qui exporte `CreateAppointmentInput`.

`backend/src/routes/appointments.spec.ts` (route via `app.request()`, factory `createAppointmentRoutes({ bookings, notifier, now })`, une instance par test) :

- **accepte une réservation valide** : RDV `2026-10-05` 10:00, 60 min, horloge fixe → `201`, corps `{ success: true, message: 'Votre rendez-vous a été réservé avec succès !' }`, `bookings.inserted` égal à `[request]`, `notifier.booked` égal à `[request]`.
- **répond 201 même quand l'envoi des emails échoue** : notifier qui rejette (sous-classe locale) → `201`, insert fait, notifier appelé une fois, aucune rejection non gérée (fire & forget).
- **refuse une requête mal formée en 400** : email invalide → `400`, aucun insert, aucune notification.
- **limite les soumissions à 5 par minute et par IP** : 6 POST sur des créneaux distincts valides → statuts `[201×5, 429]`, 5 inserts (le rate-limit vit dans la factory).

`backend/src/lib/paris-time.spec.ts` — `toParisDateTime` (`it.each`, égalité stricte `{ date, minutes }`) : `2026-07-01T07:00Z` → `2026-07-01`/540 (été) ; `2026-01-15T08:00Z` → 540 (hiver) ; `2026-03-29T00:30Z` → 90 et `01:30Z` → 210 (passage à l'heure d'été) ; `2026-10-25T00:30Z` et `01:30Z` → 150 tous deux (heure rejouée) ; `2026-10-31T23:30Z` → `2026-11-01`/30 ; `2026-12-31T22:59Z` → 1439 ; `2026-12-31T23:00Z` → `2027-01-01`/0 (minuit = 0, pas 24h).

Sortie `BU` condensée :

```
 ❯ |unit| src/routes/appointments.spec.ts (4 tests | 4 failed)
 FAIL  |unit| src/lib/paris-time.spec.ts
Error: Cannot find module './paris-time.js'
 FAIL  ... > accepte une réservation valide : 201, enregistrement et notification
TypeError: createAppointmentRoutes is not a function   (x4)
 Test Files  2 failed (2)
      Tests  4 failed (4)
```

Nature des échecs : symbole applicatif absent (`createAppointmentRoutes`) pour les 4 tests de route, module applicatif absent (`paris-time.ts`) pour la suite de 9 cas, non collectée. Aucune erreur de harnais : le module de route se charge sous Vitest (db/mailer instanciés sans connexion). `BT` (typecheck) échoue uniquement sur des symboles dus au GREEN : `createAppointmentRoutes` (`src/routes/appointments.ts`), `./paris-time.js` (`src/lib/paris-time.ts`), `BookingRepository` (`src/db/booking-repository.ts`), `BookingNotifier` (`src/lib/booking-notifier.ts`). Front : `pnpm test --watch=false` → 90 passed / 90 (19 fichiers), aucune régression.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`BU`) le 2026-10-01 19:49, 4 failed / 4 total, plus la suite `paris-time.spec.ts` (9 cas) en échec de chargement).

### Tranche 2 — règles de calendrier (422)

Horloge fixe `FIXED_NOW` = `2026-10-01T08:00Z` (jeudi, 10:00 à Paris). Entrées via `aBookingRequest` (défaut : `2026-10-05` 10:00, 60 min), doublures de `backend/src/test/booking-fakes.ts` réutilisées telles quelles (`InMemoryBookingRepository.disableDate` / `isDateDisabled` déjà présents). Aucune suite existante n'encode un état dont la sémantique change : les 4 tests de route de la tranche 1 réservent un lundi ouvré futur (`2026-10-05`), toujours valide.

`backend/src/lib/booking-rules.spec.ts` — `checkBookingRules(request, now)`, égalité stricte sur le résultat :

- **accepte un jour ouvré futur** : `2026-10-05` → `{ ok: true, duration: 60 }`.
- **accepte le 29 février d'une année bissextile** : `2028-02-29` → `{ ok: true, duration: 60 }` (garde-fou contre un `invalid_date` trop large).
- **refuse la date non calendaire** (`it.each`) : `2026-02-30`, `2027-02-29`, `2026-13-01`, `2026-00-10`, `2026-04-31`, `2026-10-00` → `{ ok: false, code: 'invalid_date', message: 'Date invalide.' }`.
- **refuse la date passée, même un jour indisponible** (`it.each`) : `2026-09-30`, `2026-09-27` (dimanche), `2025-12-25` (Noël) → `past_date`, « Cette date est passée. » (ordre `past_date` avant `unavailable_day`).
- **ne traite pas la date du jour à Paris comme passée** : `2026-10-01` → code ≠ `past_date` (assertion sur le code, stable quand la tranche 3 renverra `too_soon`).
- **juge la date passée selon l'heure de Paris** : `now = 2026-09-30T22:30Z` (00:30 le 1er à Paris), date `2026-09-30` → `past_date` (une comparaison en UTC la verrait « aujourd'hui »).
- **refuse le jour indisponible** (`it.each`) : `2026-12-25` (Noël, vendredi), `2027-05-06` (Ascension, jeudi), `2026-10-03` (samedi), `2026-10-04` (dimanche) → `unavailable_day`, « Ce jour n'est pas ouvert à la réservation. ».

`backend/src/lib/french-holidays.spec.ts` — `getUnavailableDayReason(iso)` : fériés fixes et mobiles 2026-2027 (Jour de l'An, Lundi de Pâques `2026-04-06`, Ascension `2026-05-14` et `2027-05-06`, Lundi de Pentecôte `2026-05-25`, Fête nationale, Noël), férié un dimanche (`2026-11-01` → `Toussaint`, le férié prime sur `Weekend`), samedi / dimanche → `Weekend` ; jours ouvrés (`2026-10-02`, `2026-10-05`, `2026-12-24`, `2027-05-07`) → `null`. Valeurs attendues vérifiées contre `src/app/shared/calendar/french-holidays.ts` (la parité exhaustive 2025-2035 reste en tranche 6).

`backend/src/routes/appointments.spec.ts` (ajouts) :

- **refuse en 422 sans enregistrer ni notifier** (`it.each`) : `2026-02-30` / `invalid_date`, `2026-09-30` / `past_date`, `2026-12-25` et `2026-10-03` / `unavailable_day` → statut 422, corps `{ error: <message FR>, code }`, `inserted` et `booked` vides.
- **refuse en 422 le seul jour désactivé par l'admin** : `disableDate('2026-10-05')` ; POST `2026-10-05` → 422 `{ error: "Ce jour n'est pas disponible à la réservation.", code: 'disabled_date' }` ; POST `2026-10-06` → 201 ; `inserted` et `booked` égaux à `[requête du 06]` (la date interrogée est bien celle de la requête).
- **signale la règle de calendrier avant la désactivation** : `disableDate('2026-10-03')` (samedi) → 422 `unavailable_day` (la vérification DB n'intervient qu'après les règles pures).

Sortie `BU` condensée :

```
 ❯  unit  src/routes/appointments.spec.ts (10 tests | 6 failed)
     × refuse '2026-02-30' en 422 ('invalid_date') sans rien enregistrer ni notifier
     × refuse '2026-09-30' en 422 ('past_date') sans rien enregistrer ni notifier
     × refuse '2026-12-25' en 422 ('unavailable_day') sans rien enregistrer ni notifier
     × refuse '2026-10-03' en 422 ('unavailable_day') sans rien enregistrer ni notifier
     × refuse en 422 le seul jour désactivé par l'admin, sans l'enregistrer ni le notifier
     × signale la règle de calendrier plutôt que la désactivation quand les deux s'appliquent
 FAIL   unit  src/lib/booking-rules.spec.ts
Error: Cannot find module './booking-rules.js'
 FAIL   unit  src/lib/french-holidays.spec.ts
Error: Cannot find module './french-holidays.js'
AssertionError: expected 201 to be 422 // Object.is equality   (x6)
 Test Files  3 failed | 1 passed (4)
      Tests  6 failed | 13 passed (19)
```

Nature des échecs : 6 assertions comportementales (`201` reçu au lieu de `422`) sur la route ; modules applicatifs absents (`booking-rules.ts`, `french-holidays.ts`) pour les deux suites pures (17 + 14 cas), non collectées. Aucune erreur de harnais. Non-régression : les 13 tests de la tranche 1 (4 route + 9 `toParisDateTime`) restent verts. `typecheck` backend échoue uniquement sur les deux modules dus au GREEN : `./booking-rules.js` (`src/lib/booking-rules.ts` : `checkBookingRules`, type `BookingRuleResult`) et `./french-holidays.js` (`src/lib/french-holidays.ts` : `getUnavailableDayReason`) ; à ajouter aussi au GREEN : `isDateDisabled` sur le port `BookingRepository` et dans `createBookingRepository`. Prettier vert sur les trois fichiers. Front : `pnpm test --watch=false` → 90 passed / 90 (19 fichiers), aucune régression.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`BU`) le 2026-10-01 19:58, 6 failed / 19 total, plus les suites `booking-rules.spec.ts` (17 cas) et `french-holidays.spec.ts` (14 cas) en échec de chargement).

### Tranche 3 — règles horaires et délai de prévenance (422)

Horloge `FIXED_NOW` = `2026-10-01T08:00Z` (jeudi, 10:00 à Paris ; seuil = `2026-10-02` 10:00). Entrées via `aBookingRequest` (défaut `2026-10-05` 10:00, 60 min). Doublures de `backend/src/test/booking-fakes.ts` réutilisées sans modification.

Sweep du contrat (heure, durée, délai) sur `backend/src/**/*.spec.ts` et `backend/src/test/` : `booking-rules.spec.ts`, `appointments.spec.ts`, `paris-time.spec.ts`, `french-holidays.spec.ts`, `booking-fakes.ts`. Aucune suite existante ne devient fausse : les requêtes de route utilisent `2026-10-05` (ou `2026-10-06`) à 10:00 en 60 min, et le test de rate-limit les horaires `09:00`…`16:00` en 60 min. Ces créneaux sont proposés et à plus de 24 h. Les refus `past_date`, `unavailable_day` et `invalid_date` précèdent les nouvelles règles. Le test « ne traite pas la date du jour à Paris comme passée » (`2026-10-01` 10:00) recevra `too_soon` et reste valide (assertion `≠ past_date`). Aucune adaptation mécanique.

`backend/src/lib/booking-rules.spec.ts` (ajouts) :

- **constantes** (golden `toEqual`) : `BOOKING_OPENING_HOUR` 9, `BOOKING_CLOSING_HOUR` 18, `BOOKING_SLOT_STEP_MINUTES` 30, `BOOKING_DURATIONS` `[30, 60]`, `BOOKING_LEAD_TIME_MS` 86 400 000.
- **`listSlotStarts`** : 60 min → `09:00`…`17:00` (17 débuts) ; 30 min → `09:00`…`17:30` (18 débuts), liste exacte.
- **`bookingThreshold`** (`it.each`, égalité `{ date, minutes }`) : `2026-10-01T08:00Z` → `2026-10-02`/600 ; `2026-10-24T22:30Z` → `2026-10-25`/1410 (passage à l'heure d'hiver) ; `2026-03-28T22:30Z` → `2026-03-30`/30 (passage à l'heure d'été).
- **`isSlotTooSoon`** contre `bookingThreshold(FIXED_NOW)` (`it.each`) : `2026-10-01` 17:30 → vrai (date antérieure, minutes supérieures au seuil) ; `2026-10-02` 09:30 → vrai ; `2026-10-02` 10:00 → faux (borne) ; `2026-10-02` 10:30 → faux ; `2026-10-05` 09:00 → faux (date postérieure, minutes inférieures au seuil).
- **refuse la durée** 15, 45, 90, 120 → `{ ok: false, code: 'invalid_duration', message: "Cette durée de rendez-vous n'est pas proposée." }`.
- **refuse l'horaire** `09:15`/60, `08:30`/60, `17:30`/60 (fin 18:30), `18:00`/30, `25:99`/60 → `invalid_slot`, « Cet horaire n'est pas proposé. ».
- **accepte le créneau** `17:30`/30, `17:00`/60, `09:00`/60 → `{ ok: true, duration }`.
- **refuse à moins de 24 h** : `2026-10-01` 17:00 et `2026-10-02` 09:30 → `too_soon`, « Les rendez-vous doivent être pris au moins 24 h à l'avance. ».
- **accepte un créneau à exactement 24 h** : `2026-10-02` 10:00 → `{ ok: true, duration: 60 }`.
- **première règle violée** : `2026-10-03` + 45 min → `unavailable_day` ; `09:15` + 45 min → `invalid_duration` ; `2026-10-01` `09:15` → `invalid_slot` (et non `too_soon`).
- **restreint la durée acceptée** : `expectTypeOf(result.duration).toEqualTypeOf<30 | 60>()` dans la branche `ok`. Preuve compile-time portée par `typecheck`, pas par `BU`.

`backend/src/routes/appointments.spec.ts` (ajouts) :

- **refuse en 422 sans enregistrer ni notifier** (`it.each`) : 45 min → `invalid_duration` ; `09:15` → `invalid_slot` ; `17:30` en 60 min → `invalid_slot` ; `2026-10-02` 09:30 → `too_soon`. Statut 422, corps `{ error, code }`, `inserted` et `booked` vides (aucun email).
- **accepte un créneau à exactement 24 h** : `2026-10-02` 10:00 → 201, `inserted` et `booked` égaux à `[request]`.

Sortie `BU` condensée :

```
 FAIL  unit  src/lib/booking-rules.spec.ts   (24 failed)
 FAIL  unit  src/routes/appointments.spec.ts (4 failed)
     × fixent la plage 9h-18h, le pas de 30 min, les durées 30/60 et le délai de 24 h
     × propose en 60 min / en 30 min …                      TypeError: listSlotStarts is not a function
     × place le seuil de … (x3)                             TypeError: bookingThreshold is not a function
     × juge … trop proche (x5)                              TypeError: bookingThreshold is not a function
     × refuse la durée 15/45/90/120 min                     expected { ok: true, duration: 45 } to deeply equal { ok: false, … }
     × refuse l’horaire … (x5)                              expected { ok: true, duration: 60 } to deeply equal { ok: false, … }
     × refuse '2026-10-01' '17:00' / '2026-10-02' '09:30', à moins de 24 h
     × signale la première règle violée : 'durée avant horaire' / 'horaire avant délai de prévenance'
     × refuse '…' en 422 (invalid_duration / invalid_slot x2 / too_soon)   expected 201 to be 422
 Test Files  2 failed | 2 passed (4)
      Tests  28 failed | 57 passed (85)
```

Nature des échecs : 18 assertions comportementales (règle absente : `ok: true` au lieu du refus, `201` au lieu de `422`, constantes `undefined`) ; 10 `TypeError` sur des symboles applicatifs dus au GREEN (`listSlotStarts`, `bookingThreshold`, et par ricochet `isSlotTooSoon` dont l'entrée vient de `bookingThreshold`). Aucune erreur de harnais : les deux suites se chargent, tous les cas sont collectés. 7 nouveaux tests sont verts dès maintenant, et c'est voulu : ce sont les garde-fous contre un refus trop large (créneaux `17:30`/30, `17:00`/60, `09:00`/60, exactement 24 h en pur et en route, `unavailable_day` avant `invalid_duration`, durée 60 acceptée). Non-régression : les 50 tests des tranches 1 et 2 restent verts. `typecheck` backend échoue uniquement sur des symboles dus au GREEN (`src/lib/booking-rules.ts`) : exports `BOOKING_OPENING_HOUR`, `BOOKING_CLOSING_HOUR`, `BOOKING_SLOT_STEP_MINUTES`, `BOOKING_DURATIONS`, `BOOKING_LEAD_TIME_MS`, `listSlotStarts`, `bookingThreshold`, `isSlotTooSoon`, et `duration` du succès resserré en `BookingDuration` (TS2344 sur l'`expectTypeOf`). `checkBookingRules` doit aussi lire `appointment_time`. Prettier vert. Front : `pnpm test --watch=false` → 90 passed / 90 (19 fichiers), aucune régression.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`BU`) le 2026-10-01 20:04, 28 failed / 85 total).

### Tranche 4 — créneau pris (409), contrat

Horloge `FIXED_NOW`, entrées via `aBookingRequest` (défaut `2026-10-05` 10:00, 60 min). Doublure étendue (outillage de test) : `InMemoryBookingRepository.insert` rejette `SlotTakenError` (importée de `db/booking-repository.ts`) quand la demande chevauche une réservation déjà enregistrée le même jour (plage `[)`, adjacent accepté). La sémantique de chevauchement de référence reste la base (ADR-0001), prouvée en tranche 5 ; aucun test de route n'asserte les cas limites de la doublure.

Écart de découpage, demandé par la session principale : `isExclusionViolation` est épinglé ici par un test unitaire pur (sans DB). Restent en tranche 5 : son branchement dans `createBookingRepository` (insert → `SlotTakenError`), la migration et le PATCH `/:id/status` → 409 (le handler accède à `db` en direct, testable seulement en intégration).

Sweep de l'état seedé (la doublure rejette désormais un chevauchement) sur `backend/src/**/*.spec.ts` et `backend/src/test/` : `appointments.spec.ts`, `booking-rules.spec.ts`, `paris-time.spec.ts`, `french-holidays.spec.ts`, `booking-fakes.ts`. Seul `appointments.spec.ts` enregistre plusieurs réservations dans une même instance : le test de rate-limit (`09:00`, `10:00`, `11:00`, `14:00`, `15:00` en 60 min, sans chevauchement) et le test du jour désactivé (un seul insert). Aucune suite ne devient fausse, aucune adaptation mécanique. `setup()` prend un second paramètre optionnel (repository), sans changement des appels existants.

`backend/src/routes/appointments.spec.ts` (ajouts) :

- **refuse un créneau déjà réservé en 409 sans enregistrer ni notifier la seconde demande** (`it.each`) : même créneau ; `10:30` en 30 min après `10:00` en 60 min. Statut 409, corps `{ error: "Ce créneau vient d'être réservé, choisissez-en un autre.", code: 'slot_taken' }`, `inserted` et `booked` égaux à `[première demande]` (aucun email pour la demande refusée).
- **ne traduit pas en 409 une panne d'enregistrement, et ne notifie pas** : `BrokenBookingRepository` (sous-classe locale, `insert` rejette une `Error` quelconque) → 500, `booked` vide. Garde-fou contre un `catch` trop large : vert dès maintenant, voulu.

`backend/src/db/booking-repository.spec.ts` (nouveau) — `isExclusionViolation(err)`, `toBe` strict :

- **reconnaît** : `pg.DatabaseError` de code `23P01` (`err.code`) ; `DrizzleQueryError` (vraie classe `drizzle-orm/errors`) enveloppant ce `23P01` (`err.cause.code`, footgun Drizzle 0.45).
- **ignore** : `23505` direct et enveloppé ; `DrizzleQueryError` sans cause ; `Error` sans code ; `null` ; `undefined` ; la chaîne `'23P01'`.

Sortie `BU` condensée :

```
 FAIL  unit  src/db/booking-repository.spec.ts > isExclusionViolation > reconnaît une … (x2)
 FAIL  unit  src/db/booking-repository.spec.ts > isExclusionViolation > ignore une … (x7)
TypeError: isExclusionViolation is not a function
 FAIL  unit  src/routes/appointments.spec.ts > POST /api/appointments > refuse 'le même créneau' déjà réservé en 409 …
 FAIL  unit  src/routes/appointments.spec.ts > POST /api/appointments > refuse 'un créneau qui chevauche' déjà réservé en 409 …
AssertionError: expected 500 to be 409 // Object.is equality
 Test Files  2 failed | 3 passed (5)
      Tests  11 failed | 86 passed (97)
```

Nature des échecs : 2 assertions comportementales sur la route (`500` reçu au lieu de `409` : `SlotTakenError` absente, l'erreur remonte au gestionnaire par défaut de Hono) ; 9 `TypeError` sur le symbole applicatif dû au GREEN `isExclusionViolation`. Aucune erreur de harnais : les deux suites se chargent, tous les cas sont collectés. Non-régression : les 85 tests des tranches 1 à 3 restent verts (86 passed = 85 + le garde-fou 500). `typecheck` backend échoue uniquement sur les deux symboles dus au GREEN dans `src/db/booking-repository.ts` : `SlotTakenError` (TS2305, importée par `src/test/booking-fakes.ts`) et `isExclusionViolation` (TS2305). Prettier vert sur les trois fichiers. Front : `pnpm test --watch=false` → 90 passed / 90 (19 fichiers), aucune régression.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`BU`) le 2026-10-01 20:11, 11 failed / 97 total).

### Tranche 5 — chevauchement garanti en base, y compris concurrent

Outillage de test posé (qa) :

- `backend/vitest.config.ts` : projet `integration` (`src/**/*.integration.spec.ts`, env `node`, `globalSetup: src/test/integration-global-setup.ts`, `setupFiles: src/test/integration-env.ts`, `fileParallelism: false`, `testTimeout` 15 s). Le projet `unit` exclut déjà `*.integration.spec.ts` : `BU` reste à 97 tests.
- `backend/package.json` : scripts `test:integration` (`vitest run --project integration`), `test:db:up` / `test:db:down` (conteneur `coaching-life-test-db`, `postgres:18`, port 54329), conformes à la commande `BI`.
- `src/test/integration-global-setup.ts` : exige `TEST_DATABASE_URL` (sinon erreur explicite, vérifiée : `Error: TEST_DATABASE_URL absent : la suite d'intégration exige un PostgreSQL de test (…)`, exit 1, aucun test collecté), refuse une URL égale au `DATABASE_URL` du shell ou du `.env` racine, attend la base (≤ 30 s), `DROP SCHEMA public/drizzle CASCADE`, `CREATE SCHEMA public`, `migrate()` sur `src/db/migrations`.
- `src/test/integration-env.ts` (worker) : `DATABASE_URL = TEST_DATABASE_URL` avant le chargement de `db/index.ts`. Le handler PATCH et le câblage par défaut lisent le `db` du module : la suite exerce donc le vrai pool applicatif (`max: 10`), sans toucher au code.
- `src/test/booking-db.ts` : `resetBookingTables` (`TRUNCATE appointments, disabled_dates`, avant chaque test), `seedAppointment(db, request, status)` (requête construite par `aBookingRequest`), `listBookedSlots`, `statusOf`.

Sweep de l'état seedé (la base refuse désormais un chevauchement non annulé) : `backend/src/**/*.spec.ts` et `backend/src/test/`. Aucune suite unitaire ne touche PostgreSQL (`appointments.spec.ts` et `booking-repository.spec.ts` passent par la doublure in-memory ou par des erreurs construites). `db/seed.ts` n'insère aucun rendez-vous. Aucune adaptation mécanique.

`backend/src/db/booking-repository.integration.spec.ts` (`createBookingRepository(db)` sur PostgreSQL) :

- **refuse le chevauchement par `SlotTakenError` sans l'enregistrer** (`it.each`, existant 10:00 en 60 min) : même créneau, `10:30`/30 (inclus), `10:30`/60 (déborde après), `09:30`/60 (déborde avant) → `rejects.toBeInstanceOf(SlotTakenError)`, table égale à la seule ligne 10:00.
- **considère le créneau pris** par un RDV `pending`, `confirmed`, `completed` (`it.each`) → `SlotTakenError`.
- **libère le créneau d'un RDV annulé** : ligne `cancelled` + nouvel insert même créneau → deux lignes (`cancelled`, `pending`).
- **accepte l'adjacent et l'autre jour** : 10:00/60 puis 11:00/30, 09:30/30, `2026-10-06` 10:00 → les quatre lignes exactes (plage `[)`).
- **refuse un chevauchement écrit hors du repository** : `db.insert(appointments)` direct (statut `confirmed`) → l'erreur levée satisfait `isExclusionViolation` (la garantie est en base, pas dans le repository).
- **10 insertions simultanées du même créneau** (`Promise.allSettled`, pool `max: 10`) → 1 résolue, 9 rejetées toutes `SlotTakenError`, 1 ligne.

`backend/src/routes/appointments.integration.spec.ts` (factory avec `createBookingRepository(db)`, `SpyBookingNotifier`, `fixedClock()`) :

- **2 POST simultanés du même créneau** → statuts triés `[201, 409]`, corps du 409 `{ error: "Ce créneau vient d'être réservé, choisissez-en un autre.", code: 'slot_taken' }`, notifier appelé 1 fois, 1 ligne en base.
- **PATCH `/:id/status` : réactivation d'un RDV annulé dont le créneau a été repris** (cookie de session admin signé par `signSession`) : annulé 10:00/60 + pris 10:30/30, PATCH `confirmed` → 409, corps contenant `code: 'slot_taken'`, ligne toujours `cancelled`.
- **PATCH : réactivation d'un RDV annulé au créneau libre** (voisin adjacent 11:00/30) → 200, ligne renvoyée `{ id, status: 'confirmed' }`, statut `confirmed` en base.

Sortie `BI` condensée (conteneur lancé par `test:db:up`) :

```
     × refuse 'le même créneau' d'un rendez-vous 10:00-11:00 par SlotTakenError, sans l'enregistrer
     × refuse 'un créneau inclus' / 'un créneau qui déborde après' / 'un créneau qui déborde avant' …
AssertionError: promise resolved "undefined" instead of rejecting            (x7, dont pending/confirmed/completed)
     × refuse un chevauchement écrit hors du repository, au niveau de la base
AssertionError: expected false to be true // Object.is equality
     × n'enregistre qu'une réservation sur 10 insertions simultanées du même créneau
AssertionError: expected [ { status: 'fulfilled', …(1) }, …(9) ] to have a length of 1 but got 10
     × n'accepte qu'une de deux réservations simultanées du même créneau et ne notifie qu'elle
AssertionError: expected [ 201, 201 ] to deeply equal [ 201, 409 ]
     × refuse en 409 de réactiver un rendez-vous annulé dont le créneau a été repris
AssertionError: expected 200 to be 409 // Object.is equality
 Test Files  2 failed (2)
      Tests  11 failed | 3 passed (14)
```

Nature des échecs : 11 assertions comportementales (aucune contrainte en base : les inserts chevauchants et concurrents réussissent, le PATCH réactive). Aucune erreur de harnais : reset du schéma et migrations 0000/0001 appliqués, les 14 cas collectés, résultat identique sur une seconde exécution. 3 tests verts dès maintenant, voulu : ce sont les garde-fous contre une contrainte trop large (annulé libère, adjacent et autre jour acceptés, réactivation au créneau libre). Dû au GREEN : `src/db/migrations/0002_appointments_no_overlap.sql` + entrée `_journal.json`, mapping `isExclusionViolation` → `SlotTakenError` dans `createBookingRepository.insert`, 409 dans le PATCH. Non-régression : `BU` → 97 passed / 97 (5 fichiers, aucun `*.integration.spec.ts` collecté) ; `typecheck` et `build` backend verts (aucun symbole manquant) ; Prettier vert ; front `pnpm test --watch=false` → 90 passed / 90 (19 fichiers). Conteneur arrêté et supprimé (`test:db:down`).

Point ouvert pour le GREEN : le corps du 409 du PATCH n'est pas fixé par le plan (message pensé pour le visiteur). Le test n'épingle que `code: 'slot_taken'`.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`BI`) le 2026-10-01 20:18, 11 failed / 14 total).

### Tranche 6 — règles front alignées et parité

Régime zoneless (`zone.js` absent de `package.json`) : horloge pilotée par `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime` avant `TestBed.createComponent`, `await fixture.whenStable()` après chaque interaction ; aucun `fakeAsync`. Composants montés par `TestBed.createComponent(…, { bindings: [inputBinding, outputBinding] })` (pas de `@defer` dans le picker ni le calendrier). Données via `DisabledDateBuilder`.

Sweep du contrat (`AppointmentFormData.duration: BookingDuration`, créneaux masqués, jours indisponibles) sur `src/**/*.spec.ts`, `src/app/features/booking/test-utils/` et `backend/src/**/*.spec.ts` : aucune suite existante ne monte le picker ni le calendrier ; `AppointmentFormDataBuilder` (défaut 60) et `AppointmentBuilder` restent valides ; `http-appointment.gateway.spec.ts` (ligne `AppointmentRow`, `duration: 60`) inchangé. Seule suite rendue fausse par le resserrement de type : `appointment.adapter.spec.ts` (`toInsert`), qui construisait une `AppointmentFormData` de 45 min, durée qui ne compile plus. **Adaptation iso-invariant** (pas mécanique : la valeur attendue bouge avec l'entrée) : `45` → `30` en entrée et en sortie attendue ; l'invariant (la durée est recopiée telle quelle en `snake_case`, valeur distincte du défaut 60) est conservé. Le test reste vert avant et après le GREEN. `AppointmentRow.duration` / `Appointment.duration` (`90` dans le même fichier) restent `number` : non concernés.

`src/app/features/booking/domain/booking-rules.spec.ts` — `hasBookableSlot(date, threshold)` (`it.each`, `toBe` strict) : seuil `2026-10-02`/600 → `2026-09-30` faux, `2026-10-01` faux, `2026-10-02` vrai, `2026-10-05` vrai ; seuil `2026-10-02`/1050 → `2026-10-02` vrai (17:30 en 30 min à exactement 24 h) ; seuil `2026-10-02`/1051 → `2026-10-02` faux, `2026-10-03` vrai (la règle ne juge que le délai, pas le week-end). Les autres fonctions du jumeau sont prouvées par la parité.

`src/app/features/booking/components/booking-time-picker.spec.ts` (horloge `2026-10-01T08:00Z`, seuil `2026-10-02` 10:00) :

- **propose les durées 30 min et 1h** : libellés des boutons de durée égaux à `['30 min', '1h']` (garde-fou de la génération depuis `BOOKING_DURATIONS`, vert dès maintenant).
- **propose tous les créneaux d'une journée à plus de 24 h** : `2026-10-05` → `09:00`…`17:00` (garde-fou, vert).
- **masque les créneaux du lendemain à moins de 24 h** : `2026-10-02` → `10:00`…`17:00` exactement.
- **idem en 30 min** : clic « 30 min » → `10:00`…`17:30`.
- **recalcule quand la date change** : `date` lié à un signal `2026-10-05` puis `set('2026-10-02')` → `10:00`…`17:00`.
- **aucun créneau pour aujourd'hui** : `2026-10-01` → liste vide et message « Aucun créneau disponible pour cette date. ».
- **émet le premier créneau réservable** : clic sur le premier bouton de `2026-10-02` → émissions `[{ time: '10:00', duration: 60 }]`.

`src/app/features/booking/components/booking-calendar.spec.ts` (bouton du jour trouvé par son numéro dans la grille ; assertions `disabled` + `aria-label` exact) :

- **aujourd'hui indisponible pour délai de prévenance** (`2026-10-01T08:00Z`) : jour 1 `disabled`, label « jeudi 1 octobre 2026, indisponible : Délai de prévenance de 24 h ».
- **aujourd'hui non sélectionnable** : clic jour 1 → aucune émission de `selectedDateChange`.
- **lendemain réservable** (`08:00Z`) : jour 2 actif, label « vendredi 2 octobre 2026, disponible », clic → `['2026-10-02']` (garde-fou, vert).
- **lendemain réservable à exactement 24 h du dernier créneau** (`15:30Z`, 17:30 à Paris) : jour 2 actif (borne, garde-fou, vert).
- **lendemain indisponible une fois 17:30 passé sous les 24 h** (`15:31Z`) : jour 2 `disabled`, label « vendredi 2 octobre 2026, indisponible : Délai de prévenance de 24 h ».
- **raison admin prioritaire** : `disabledDates` = `2026-10-01` « Formation » → label « …, indisponible : Formation » (garde-fou, vert).
- **week-end prioritaire sur le délai** (`2026-10-02T15:31Z`, samedi 3 sans créneau réservable) → label « samedi 3 octobre 2026, indisponible : Weekend » (garde-fou, vert).

`backend/src/lib/booking-rules.parity.spec.ts` (importe directement `src/app/features/booking/domain/booking-rules.ts` et `src/app/shared/calendar/french-holidays.ts`) :

- **fichiers de règles front sans import** (`it.each` sur les deux fichiers) : `not.toMatch(/^\s*import\s/m)` sur le source complet (regex vérifiée : rejette `import type …` en début de ligne, ignore un commentaire « importe »).
- **constantes** : ouverture, fermeture, pas, durées, délai front `toEqual` back.
- **`listSlotStarts`** égal pour chaque durée de `BOOKING_DURATIONS` (back).
- **`toParisDateTime`** et **`bookingThreshold`** égaux sur 14 instants (`it.each`) : seuils de la tranche 3 et du calendrier (`2026-10-01T08:00Z`, `15:30Z`, `15:31Z`), été/hiver, passage à l'heure d'été (`2026-03-28T22:30Z`, `03-29T00:30Z`, `01:30Z`), heure rejouée (`2026-10-24T22:30Z`, `10-25T00:30Z`, `01:30Z`), changements de jour et d'année.
- **`isSlotTooSoon`** pour ces 14 instants : chaque début de chaque durée sur J-1, J, J+1 du seuil → aucune divergence front/back, et les verdicts contiennent à la fois `true` et `false` (garde contre une comparaison vide).
- **disponibilité de chaque jour de 2025 à 2035** : `getUnavailableReason(new Date(y, m-1, d), getFrenchHolidays(y))` === `getUnavailableDayReason(iso)` (égalité de la raison, `null` compris), 4017 jours comparés, liste des divergences égale à `[]`.

Sortie `pnpm test --watch=false` (front) condensée :

```
✘ [ERROR] Could not resolve "./booking-rules"
    src/app/features/booking/domain/booking-rules.spec.ts:1:32
✘ [ERROR] TS2307: Cannot find module './booking-rules' or its corresponding type declarations.
 ELIFECYCLE  Test failed.
```

Le bundle `ng test` compile toutes les specs ensemble : le module absent bloque la suite entière. Mesure comportementale prise avec `booking-rules.spec.ts` mis de côté le temps d'une exécution (puis remis) :

```
 × masque les créneaux du lendemain qui commencent à moins de 24 h
     expected [ '09:00', '09:30', '10:00', …(14) ] to deeply equal [ '10:00', '10:30', '11:00', …(12) ]
 × masque les créneaux à moins de 24 h aussi en 30 min
 × recalcule les créneaux masqués quand la date change
 × n’affiche aucun créneau pour aujourd’hui        expected [ '09:00', … ] to deeply equal []
 × émet le premier créneau réservable du lendemain avec sa durée
     expected [ { time: '09:00', duration: 60 } ] to deeply equal [ { time: '10:00', duration: 60 } ]
 × rend indisponible aujourd’hui pour délai de prévenance      expected false to be true
 × ne sélectionne pas aujourd’hui au clic                      expected [ '2026-10-01' ] to deeply equal []
 × rend le lendemain indisponible une fois son dernier créneau passé sous les 24 h   expected false to be true
 Test Files  2 failed | 19 passed (21)
      Tests  8 failed | 96 passed (104)
```

Sortie `BU` condensée :

```
 FAIL  unit  src/lib/booking-rules.parity.spec.ts
Error: Cannot find module '../../../src/app/features/booking/domain/booking-rules.js'
 Test Files  1 failed | 5 passed (6)
      Tests  97 passed (97)
```

Nature des échecs : 8 assertions comportementales sur les composants (créneaux non masqués, jours non désactivés) ; module applicatif absent `src/app/features/booking/domain/booking-rules.ts`, **scaffold dû au GREEN**, qui empêche le chargement de `booking-rules.spec.ts` (7 cas) côté front et de `booking-rules.parity.spec.ts` (48 cas) côté back. Aucune erreur de harnais : les deux specs de composant se montent sous zoneless, et la moitié de la parité qui ne dépend pas du nouveau module (fériés 2025-2035, absence d'import de `french-holidays.ts`) a été exécutée sur une copie temporaire : 2 passed, ce qui prouve la résolution `.js` → `.ts` des fichiers front par Vitest backend et le calcul des 4017 jours. 6 tests de composant verts dès maintenant, voulu : garde-fous du parcours nominal (durées, journée complète, lendemain réservable et cliquable, borne exacte, priorité admin et week-end). Non-régression : front 90 existants verts (96 passed = 90 + 6 garde-fous), back 97 passed / 97. `typecheck` backend échoue uniquement sur `../../../src/app/features/booking/domain/booking-rules.js` (TS2307, dû au GREEN) : l'import NodeNext de `french-holidays.ts` front typecheck. Exports attendus du jumeau front : `BOOKING_OPENING_HOUR`, `BOOKING_CLOSING_HOUR`, `BOOKING_SLOT_STEP_MINUTES`, `BOOKING_DURATIONS`, `BOOKING_LEAD_TIME_MS`, `listSlotStarts`, `toParisDateTime`, `bookingThreshold`, `isSlotTooSoon`, `hasBookableSlot`, type `BookingDuration`, sans aucune ligne `import`. Prettier vert sur les cinq fichiers.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`pnpm test --watch=false` + `BU`) le 2026-10-01 20:30, 8 failed / 104 total côté composants, plus les suites `booking-rules.spec.ts` (7 cas) et `booking-rules.parity.spec.ts` (48 cas) en échec de chargement sur le module dû au GREEN).

### Tranche 7 — 409 consommé par le front

Régime zoneless : `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(2026-10-01T08:00Z)`, `await fixture.whenStable()` après chaque interaction, aucun `fakeAsync` (fuseau européen supposé, comme la tranche 6). `Booking` contient **lui-même** un `@defer (on viewport)` (calendrier, sélecteur, formulaire) : `deferBlockBehavior: DeferBlockBehavior.Manual` puis `render(DeferBlockState.Complete)` sur le seul bloc. Pas d'Angular Testing Library ni de jest-dom dans le dépôt : boutons trouvés par leur nom accessible (`aria-label`, à défaut texte), champs par leur `<label>`. `AppointmentGateway` doublé (aucune doublure partagée du port n'existe), données via `AppointmentFormDataBuilder` / `AppointmentBuilder`. Parcours piloté par le DOM réel des enfants : clic sur le jour, clic sur le créneau, saisie du formulaire, clic « Confirmer la réservation ».

Sweep du contrat (`AppointmentSubmission` → union discriminée) sur `src/**/*.spec.ts` et `backend/src/**/*.spec.ts` : consommateurs `http-appointment.gateway.spec.ts` (test d'échec 500 recalibré, intégré au `it.each` des statuts génériques avec `reason: 'error'`) et `submit-appointment.use-case.spec.ts` (fixture d'échec `satisfies AppointmentSubmission` complétée de `reason: 'error'` ; l'invariant « le use case relaie le résultat du gateway » est inchangé). `contact` (`success: false` de `HttpMessageGateway`) a son propre type, non concerné. Aucun test backend ne consomme le type front.

Contrat retenu pour le 422 sans `error` textuel : `reason: 'rejected'` + message générique (§ 3 du plan et brief). La liste de la sous-section `### Tranches` dit `error` pour « 422 sans corps » : contradiction tranchée en faveur du § 3, à confirmer.

`src/app/features/booking/infra/http-appointment.gateway.spec.ts` (`submitAppointment`, `HttpTestingController`) :

- **409 → `slot-taken`** : corps serveur `{ error: 'Conflit' }` volontairement différent → `{ success: false, reason: 'slot-taken', message: "Ce créneau vient d'être réservé, choisissez-en un autre." }` (message front constant).
- **422 avec `error` textuel → `rejected`** + `"Cet horaire n'est pas proposé."` (message serveur relayé).
- **422 sans corps / `error` non textuel** (`it.each`) → `rejected` + message générique.
- **400, 429, 500 → `error`** (`it.each`, corps `{ error: 'Message serveur' }` non relayé) + message générique.
- **erreur réseau → `error`** + message générique.
- Succès 201 inchangé (garde-fou existant, vert).

`src/app/features/booking/pages/booking.spec.ts` (premier test de composant de `Booking`, RDV sur `lundi 5 octobre 2026`, créneau `10:00`) :

- **succès inchangé** : message « Votre rendez-vous a été réservé avec succès ! » affiché, bouton de confirmation absent, sélecteur retiré, invite « Sélectionnez un créneau » revenue (garde-fou, vert).
- **409 : message dédié, formulaire retiré** : message affiché, bouton « Confirmer la réservation » absent.
- **409 : date conservée, créneau pris rafraîchi** : le gateway enregistre le RDV pris pendant la soumission → après le 409, le bouton « 10:00, créneau réservé » est `disabled` et « 11:00, disponible » est présent (10:30 chevauche le RDV de 60 min) (sélecteur toujours affiché sur la même date).
- **409 : rechargement du mois de la date, pas du mois affiché** : calendrier avancé au mois suivant avant la confirmation → `getBookedSlots` appelé exactement `[['2026-10']]`.
- **refus `rejected` : formulaire conservé** : message serveur affiché, bouton de confirmation présent (garde-fou, vert).

Sortie `pnpm test --watch=false` (front), fichiers de la tranche en place :

```
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'reason' does not exist in type 'AppointmentSubmission'. [plugin angular-compiler]
    src/app/features/booking/domain/use-cases/submit-appointment.use-case.spec.ts:20:8
 ELIFECYCLE  Test failed.
```

Le compilateur Angular typecheck toutes les specs, `--include` compris : la fixture alignée sur l'union bloque la suite entière. **Scaffold dû au GREEN** : union `AppointmentSubmission` dans `src/app/features/booking/domain/models/appointment.model.ts` (déjà actée au § 3). Mesure comportementale prise avec cette seule ligne retirée le temps d'une exécution (puis remise) :

```
 × should return a slot-taken failure with the front message on 409
 × should return a rejected failure carrying the server message on 422
 × should return a rejected failure with the generic message on 422 'sans corps'
 × should return a rejected failure with the generic message on 422 'avec un error non textuel'
 × should return a generic error failure on 400 / 429 / 500
 × should return a generic error failure on network error
     AssertionError: expected { success: false, …(1) } to deeply equal { success: false, …(2) }
 × affiche le message dédié et retire le formulaire quand le créneau vient d’être pris
     AssertionError: expected <button type="submit" …> to be null
 × garde la date et affiche le créneau pris comme réservé après rechargement
     AssertionError: expected undefined to be true
 × recharge les créneaux du mois de la date choisie même si le calendrier a changé de mois
     AssertionError: expected [] to deeply equal [ [ '2026-10' ] ]
 Test Files  2 failed | 21 passed (23)
      Tests  11 failed | 112 passed (123)
```

Nature des échecs : 11 assertions comportementales (8 gateway sans `reason`, 3 page sans branche `slot-taken`), aucune erreur de harnais. Les deux garde-fous de `Booking` (succès, refus `rejected`) sont verts : le harnais `@defer` manuel, la saisie du formulaire et la soumission fonctionnent sous zoneless. Non-régression : 110 tests existants verts (111 − l'ancien test d'échec 500, recalibré dans l'`it.each` des statuts génériques) + 2 garde-fous = 112. `BU` : 145 passed / 145. `pnpm typecheck` (`tsconfig.app.json`) et `format:check` verts.

Tous les tests de cette tranche échouent à ce stade (RED confirmé via la commande test du profil (`pnpm test --watch=false` + `BU`) le 2026-10-01 20:42, 11 failed / 123 total, fixture du use case en échec de typecheck sur le type dû au GREEN).

## Implémentation

### Tranche 1

- `CreateAppointmentInput` et `createAppointmentSchema` vivent dans `backend/src/lib/appointment-schema.ts` (sortis de la route) : `db/booking-repository.ts` et `lib/booking-notifier.ts` en dépendent sans importer `routes/`.
- Ports réduits à ce que la tranche exerce : `BookingRepository = { insert }` (`isDateDisabled` arrive en tranche 2 avec `disabled_date`), `BookingNotifier = { appointmentBooked }`. `createBookingRepository(db)` fait l'insert Drizzle sans mapping d'erreur ; `mailBookingNotifier` reprend les deux envois existants.
- `createAppointmentRoutes({ bookings, notifier, now })` : rate-limit de soumission instancié dans la factory ; `appointmentRoutes = createAppointmentRoutes(defaultDeps)` exporté, `backend/src/index.ts` inchangé. `now` fait partie du contrat de deps mais n'est lu qu'à partir de la tranche 2.
- **Écart au plan** : `checkBookingRules` « réduit à `{ ok: true }` » n'est **pas** introduit. Aucun test de la tranche ne l'exerce, et une fonction qui renvoie toujours `ok` serait du code non couvert. Il arrive en tranche 2 avec sa première règle (`invalid_date`).

### Tranche 2

- `backend/src/lib/french-holidays.ts` : jumeau du calcul front (mêmes libellés, même algorithme de Meeus), mais en arithmétique `Date.UTC` / `getUTCDay` sur la chaîne ISO : indépendant du fuseau du conteneur. Seul `getUnavailableDayReason(iso)` est exporté (la map des fériés reste privée, pas de consommateur hors fichier).
- `backend/src/lib/booking-rules.ts` : `checkBookingRules(request, now)` renvoie la première violation parmi `invalid_date` (aller-retour `Date.UTC` → ISO) → `past_date` (comparaison lexicale avec `toParisDateTime(now).date`) → `unavailable_day` ; succès `{ ok: true, duration }`. `BOOKING_RULE_MESSAGES` exporté (lu par la route pour `disabled_date`).
- Port `BookingRepository` étendu de `isDateDisabled` ; `createBookingRepository` l'implémente par un `SELECT id … WHERE date = ? LIMIT 1` sur `disabled_dates`.
- Route POST : règles pures, puis `isDateDisabled`, puis `insert` ; refus → 422 `{ error, code }`, sans insert ni notification.
- **Réduit à la tranche (le plan complet arrive en tranche 3)** : `BookingRuleViolation` ne porte que les 4 codes exercés ; `duration` du succès est typé `number` (le resserrement en `BookingDuration` suit l'arrivée de `invalid_duration`) ; `checkBookingRules` prend `Pick<…, 'appointment_date' | 'duration'>` (`appointment_time` arrive avec `invalid_slot` / `too_soon`). `BookingRuleResult` n'est pas exporté : aucun consommateur hors du fichier.

### Tranche 3

- `backend/src/lib/booking-rules.ts` : constantes `BOOKING_OPENING_HOUR`, `BOOKING_CLOSING_HOUR`, `BOOKING_SLOT_STEP_MINUTES`, `BOOKING_DURATIONS` (`as const`), `BOOKING_LEAD_TIME_MS` ; `listSlotStarts(duration)` (débuts au pas de 30 min dès 9h tant que `début + durée <= 18:00`) ; `bookingThreshold(now)` (`now + 24 h` sur l'instant absolu, puis `toParisDateTime`) ; `isSlotTooSoon(date, time, threshold)` (ordre lexicographique date ISO puis minutes, borne exacte acceptée).
- `checkBookingRules` lit `appointment_time` et enchaîne, après les règles de calendrier, `invalid_duration` (garde de type `isBookingDuration`) → `invalid_slot` (`time ∉ listSlotStarts(duration)`, couvre aussi `25:99`) → `too_soon`. `BookingRuleViolation` porte désormais les 7 codes du plan ; `duration` du succès est resserré en `BookingDuration` (`30 | 60`) par la garde.
- `ParisDateTime` est exporté par `paris-time.ts` : `booking-rules.ts` en a besoin pour typer `bookingThreshold` / `isSlotTooSoon`. `BookingDuration`, `BookingRuleResult` et les helpers `formatTime` / `toMinutes` restent privés (aucun consommateur hors fichier à ce stade).
- Route inchangée : le 422 `{ error, code }` existant relaie les nouveaux codes.

### Tranche 4

- `backend/src/db/booking-repository.ts` : `SlotTakenError` (classe d'erreur nommée, message neutre) et `isExclusionViolation(err: unknown)` : vrai si `err.code` ou, pour une `Error`, `err.cause.code` vaut `23P01` (garde `hasSqlState` privée, constante `EXCLUSION_VIOLATION` privée). Exporté sans consommateur applicatif à ce stade : le plan le branche dans `createBookingRepository` en tranche 5, le test unitaire l'épingle dès maintenant (écart de découpage demandé).
- Route POST : `insert` entouré d'un `try/catch` qui ne traduit que `SlotTakenError` en 409 `{ error: "Ce créneau vient d'être réservé, choisissez-en un autre.", code: 'slot_taken' }` et relance tout le reste (500 par le gestionnaire Hono, garde-fou testé). Le `return` du 409 précède le `notifier` : aucun email pour une demande refusée.
- **Non fait (tranche 5)** : `createBookingRepository.insert` ne lève pas encore `SlotTakenError` (pas de contrainte en base, pas de mapping), PATCH `/:id/status` inchangé. En production, le 409 reste donc inatteignable jusqu'à la tranche 5.

### Tranche 5

- `backend/src/db/migrations/0002_appointments_no_overlap.sql` (écrite à la main, `drizzle-kit generate` non lancé) : fonction `appointment_slot(text, text, integer) RETURNS tsrange` `IMMUTABLE STRICT PARALLEL SAFE`, début calculé une seule fois par `make_timestamp` dans une sous-requête, plage `[)` ; `ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (…) WHERE (status <> 'cancelled')`. Pas de `--> statement-breakpoint`, comme 0000 et 0001 (le migrator envoie le fichier en un seul appel, protocole simple). Entrée `idx: 2` dans `meta/_journal.json`, `when` = `1790812800000` (2026-10-01), supérieur à 0001 : le migrator l'applique sur une base déjà en 0001.
- `schema.ts` : commentaire d'une ligne au-dessus de `appointments` signalant la contrainte portée par la migration.
- `createBookingRepository.insert` : `isExclusionViolation(err)` → `SlotTakenError`, toute autre erreur relancée.
- PATCH `/:id/status` : `isExclusionViolation` → 409 `{ error: 'Ce créneau est déjà occupé par un autre rendez-vous.', code: 'slot_taken' }` (message destiné à l'admin, le message visiteur du POST ne convient pas) ; autre erreur relancée (500). Le `404` et le `200` restent dans le `try`, ce qui évite un `let` non typé.
- `backend/scripts/preflight-0002-appointments.sql` : **aligné, non modifié**. Vérifié sur `postgres:18` en appliquant 0000/0001 puis des lignes piégées : le script remonte `2026-02-30` (`jour inexistant`, bloquant) et la paire 10:00/60 – 10:30/30, et ignore l'adjacent 11:00 et l'annulé ; 0002 échoue alors sur ces deux cas (`date field value out of range`, puis `could not create exclusion constraint`), puis passe une fois les lignes corrigées/annulées et le script revenu à 0 ligne. Le script est plus strict que la fonction sur la forme (ex. `2026-1-5` serait signalé bloquant alors que `split_part` l'accepterait) : sans effet sur la sûreté du déploiement.
- Chemin de migration du conteneur (`Dockerfile` : `cp -r backend/src/db/migrations backend/dist/db/migrations`, puis `start.sh` : `node dist/db/migrate.js`) rejoué à l'identique sur base vierge : `Migrations applied`, 3 lignes dans `drizzle.__drizzle_migrations`, contrainte `appointments_no_overlap` présente, `appointment_slot` en `provolatile = 'i'`.

### Tranche 6

- `src/app/features/booking/domain/booking-rules.ts` (nouveau, **aucune ligne `import`**, commentaire d'une ligne en tête qui le rappelle, cf. ADR-0002) : copie des constantes et des fonctions du backend (`listSlotStarts`, `toParisDateTime` avec le même `Intl.DateTimeFormat` Europe/Paris, `bookingThreshold`, `isSlotTooSoon`) et `hasBookableSlot(date, threshold)` (vrai s'il existe une durée et un début non trop proche ; ne juge que le délai, pas le week-end). Exports limités à ce que le brief et la parité consomment ; `ParisDateTime` et les helpers `formatTime` / `toMinutes` restent privés.
- `BookingTimePicker` : constantes en dur supprimées. Les créneaux viennent de `listSlotStarts(duration)` filtrés par `!isSlotTooSoon(date, time, bookingThreshold(new Date()))` dans le `computed`. Les boutons de durée sont générés par `@for` sur `BOOKING_DURATIONS`, avec des libellés `Record<BookingDuration, string>` (`30 min` / `1h`, inchangés). `selectedDuration` et la durée émise sont typés `BookingDuration`. Le calcul de chevauchement avec les RDV pris est inchangé.
- `BookingCalendar` : `bookingThreshold(new Date())` est calculé une fois par grille. Raison `'Délai de prévenance de 24 h'` quand `!hasBookableSlot`, en dernier dans `adminReason ?? unavailableReason ?? leadTimeReason`, ce qui donne la priorité admin > férié/week-end > délai. `isPast` est inchangé (le libellé « date passée » reste prioritaire sur les jours passés).
- `AppointmentFormData.duration: BookingDuration`. La page `Booking` type son `selectedSlot` / `onSlotSelected` en `BookingDuration` (resserrement de type requis par la compile, aucun changement de comportement).
- SSR : aucun accès `window` ajouté. Le formatter `Intl` est créé au chargement du module, ce qui ne pose pas de problème côté serveur. `new Date()` n'est lu que dans les `computed`. `pnpm build` prérend toujours les 5 routes.

## Journal des tranches

- **Tranche 1 — réservation nominale acceptée, infra de test backend** : GREEN 13 passed / 13 total (4 route + 9 `toParisDateTime`) · refactor : passe manuelle (skill `simplify` indisponible en sous-agent), `ParisDateTime` dés-exporté (aucun consommateur hors fichier), import de type `db` renommé `appDb` dans le repository pour ne pas masquer le paramètre
- **Tranche 2 — règles de calendrier (422)** : GREEN 50 passed / 50 total (10 route + 9 `toParisDateTime` + 17 `checkBookingRules` + 14 `getUnavailableDayReason`) · refactor : passe manuelle (skill `simplify` indisponible en sous-agent), commentaire d'en-tête de `french-holidays.ts` réduit à son WHY (jumeau front, calcul UTC), aucun autre changement
- **Tranche 3 — règles horaires et délai de prévenance (422)** : GREEN 85 passed / 85 total (backend ; `typecheck` vert, dont l'`expectTypeOf` `30 | 60`) · refactor : passe manuelle (skill `simplify` indisponible en sous-agent), aucun changement retenu (helpers `formatTime` / `toMinutes` privés et nommés par intention, aucune duplication avec l'existant)
- **Tranche 4 — créneau pris (409), contrat** : GREEN 97 passed / 97 total (backend ; `typecheck` et `build` verts ; front 90 / 90) · refactor : passe manuelle (skill `simplify` indisponible en sous-agent), aucun changement retenu (le test du SQLSTATE factorisé dès le premier jet dans `hasSqlState`, message 409 littéral à son unique site d'usage)
- **Tranche 5 — chevauchement garanti en base, y compris concurrent** : GREEN 14 passed / 14 total (intégration `BI`, PostgreSQL 18) ; `BU` 97 / 97 ; `typecheck` et `build` verts ; front 90 / 90 · refactor : passe manuelle (skill `simplify` indisponible en sous-agent), PATCH réécrit avec le `404`/`200` dans le `try` (supprime un `let row` non typé), `make_timestamp` calculé une seule fois dans `appointment_slot` (sous-requête) au lieu d'être dupliqué
- **Tranche 6 — règles front alignées et parité** : GREEN front 111 passed / 111 total, backend 145 passed / 145 total (dont la parité, 48 cas) ; `typecheck` front et back, `build` front et back, `format:check` verts · refactor : passe manuelle (skill `simplify` indisponible en sous-agent). La boucle imbriquée du picker est remplacée par `listSlotStarts(...).filter(...).map(...)`, ce qui supprime aussi le type littéral mutable des créneaux. Aucun autre changement retenu : le type inline `{ time; duration: BookingDuration }` en double dans `booking.ts` est antérieur, et `booking.ts` est retouché en tranche 7.

## Verify

**Tranche 1 : PASS.** La tranche restructure `POST /api/appointments`, déjà atteignable en production : la preuve est due.

Steps (backend seul, PostgreSQL jetable `postgres:18` sur le port 54339, SMTP volontairement injoignable) :

1. `docker run --rm -d --name cl-f001-verify -e POSTGRES_PASSWORD=test -p 54339:5432 postgres:18`
2. `DATABASE_URL=postgres://postgres:test@localhost:54339/postgres npx tsx src/db/migrate.ts` → `Migrations applied`
3. `PORT=3917 SMTP_HOST=127.0.0.1 SMTP_PORT=1 … npx tsx src/index.ts` → `Backend démarré sur http://localhost:3917`
4. `POST /api/appointments` valide (`2026-10-05` 10:00, 60 min) ; `POST` mal formé ; `GET /api/appointments/booked?month=2026-10` ; `GET /health`

Capture (sorties curl) :

```
POST valide     → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
POST mal formé  → {"success":false,"error":{"name":"ZodError",…}} HTTP 400
GET /booked     → [{"appointment_date":"2026-10-05","appointment_time":"10:00","duration":60}] HTTP 200
GET /health     → {"status":"ok",…} HTTP 200
```

Console serveur : propre, à une ligne attendue près. `[mail] appointment: Error: connect ECONNREFUSED 127.0.0.1:1` est loggée **après** le `--> POST /api/appointments 201` : l'échec SMTP provoqué est bien absorbé en fire & forget par `mailBookingNotifier` via la route, sans rejection non gérée ni crash. La ligne réservée est en base (relue par `/booked`). Le câblage par défaut (`createBookingRepository(db)` + `mailBookingNotifier`) est donc exercé de bout en bout.

**Tranche 2 : PASS.** La tranche modifie `POST /api/appointments` (atteignable en production) et ajoute une requête `disabled_dates` au chemin nominal : la preuve est due.

Steps (horloge réelle, 2026-10-01 ; PostgreSQL jetable `postgres:18` sur 54339, SMTP volontairement injoignable) :

1. `docker run --rm -d --name cl-f001-verify2 -e POSTGRES_PASSWORD=test -p 54339:5432 postgres:18`, puis `npx tsx src/db/migrate.ts` → `Migrations applied`
2. `INSERT INTO disabled_dates(date, reason) VALUES ('2026-10-06','test')` (via `docker exec … psql`)
3. `PORT=3918 … npx tsx src/index.ts`, puis un `POST /api/appointments` (10:00, 60 min) par date ; second serveur sur 3919 pour le jour désactivé (le rate-limit de 5/min avait servi le 6e appel en 429, comportement attendu)
4. `GET /api/appointments/booked?month=2026-10` et `?month=2026-12`

Capture (sorties curl) :

```
2026-10-05 → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
2026-02-30 → {"error":"Date invalide.","code":"invalid_date"} HTTP 422
2026-09-30 → {"error":"Cette date est passée.","code":"past_date"} HTTP 422
2026-12-25 → {"error":"Ce jour n'est pas ouvert à la réservation.","code":"unavailable_day"} HTTP 422
2026-10-03 → {"error":"Ce jour n'est pas ouvert à la réservation.","code":"unavailable_day"} HTTP 422
2026-10-06 → {"error":"Ce jour n'est pas disponible à la réservation.","code":"disabled_date"} HTTP 422
2026-10-07 → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
GET /booked?month=2026-10 → [{…"2026-10-05"…},{…"2026-10-07"…}] HTTP 200
GET /booked?month=2026-12 → [] HTTP 200
```

Console serveur : propre. Les seules lignes `[mail] appointment: Error: connect ECONNREFUSED 127.0.0.1:1` suivent les deux `201` (échec SMTP provoqué, absorbé en fire & forget) ; aucune ne suit un `422`, donc aucun email n'est tenté pour une réservation refusée. Seuls les deux RDV acceptés sont en base. `isDateDisabled` (Drizzle) est exercé sur vrai PostgreSQL : jour désactivé refusé, jour voisin accepté.

**Tranche 3 : PASS.** La tranche ajoute trois refus au chemin `POST /api/appointments` (atteignable en production) : la preuve est due.

Steps (horloge réelle, 2026-10-01 20:06 CEST, soit seuil de prévenance au 2026-10-02 20:06 ; PostgreSQL jetable `postgres:18` sur 54339, SMTP volontairement injoignable) :

1. `docker run --rm -d --name cl-f001-verify3 -e POSTGRES_PASSWORD=test -p 54339:5432 postgres:18`, puis `npx tsx src/db/migrate.ts` → `Migrations applied`
2. `PORT=3920 SMTP_HOST=127.0.0.1 SMTP_PORT=1 … npx tsx src/index.ts`
3. Un `POST /api/appointments` par cas (5, sous le rate-limit de 5/min), puis `GET /api/appointments/booked?month=2026-10`

Capture (sorties curl) :

```
2026-10-05 10:00 60min → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
2026-10-05 14:00 45min → {"error":"Cette durée de rendez-vous n'est pas proposée.","code":"invalid_duration"} HTTP 422
2026-10-05 09:15 60min → {"error":"Cet horaire n'est pas proposé.","code":"invalid_slot"} HTTP 422
2026-10-05 17:30 60min → {"error":"Cet horaire n'est pas proposé.","code":"invalid_slot"} HTTP 422
2026-10-02 17:00 60min → {"error":"Les rendez-vous doivent être pris au moins 24 h à l'avance.","code":"too_soon"} HTTP 422
GET /booked → [{"appointment_date":"2026-10-05","appointment_time":"10:00","duration":60}] HTTP 200
```

Console serveur : propre. Une seule ligne `[mail] appointment: Error: connect ECONNREFUSED 127.0.0.1:1`, juste après le `--> POST /api/appointments 201` (échec SMTP provoqué, absorbé en fire & forget) ; les quatre `422` ne sont suivis d'aucune tentative d'email. Seul le RDV accepté est en base.

**Tranche 4 : PASS.** La tranche enveloppe l'`insert` du chemin `POST /api/appointments` (atteignable en production) dans un `try/catch` : la preuve est due sur le chemin nominal. Le 409 lui-même n'est pas atteignable en production avant la tranche 5 (le repository Drizzle ne lève pas encore `SlotTakenError`) ; il est prouvé par les tests de route.

Steps (horloge réelle, 2026-10-01 ; PostgreSQL jetable `postgres:18` sur 54339, SMTP volontairement injoignable) :

1. `docker run --rm -d --name cl-f001-verify4 -e POSTGRES_PASSWORD=test -p 54339:5432 postgres:18`, puis `npx tsx src/db/migrate.ts` → `Migrations applied`
2. `PORT=3921 SMTP_HOST=127.0.0.1 SMTP_PORT=1 … npx tsx src/index.ts`
3. `POST /api/appointments` valide (`2026-10-05` 10:00, 60 min), puis le même créneau une seconde fois, puis `GET /api/appointments/booked?month=2026-10`

Capture (sorties curl) :

```
1er POST 2026-10-05 10:00 → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
2e POST même créneau      → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
GET /booked               → [{…"2026-10-05","10:00",60},{…"2026-10-05","10:00",60}] HTTP 200
```

Le second 201 est attendu à ce stade : sans contrainte d'exclusion ni mapping (tranche 5), la base accepte le doublon. Ce qui est prouvé ici : le chemin nominal traverse le `try/catch` sans régression (201, ligne en base, notification tentée).

Console serveur : propre. Une ligne `[mail] appointment: Error: connect ECONNREFUSED 127.0.0.1:1` après chaque `--> POST /api/appointments 201` (échec SMTP provoqué, absorbé en fire & forget). Le premier `POST` de la session (corps de test mal formé, `coaching_type` invalide) a reçu un 400 Zod, sans email.

Observation hors périmètre (préexistante, non introduite par ce diff) : un `docker stop` de la base pendant que le serveur tourne fait **planter le processus** (`Unhandled 'error' event` émis par le `Pool` de `backend/src/db/index.ts`, qui n'a pas d'écouteur `error`, code `57P01`). À remonter comme constat séparé ; le cas « panne d'enregistrement → 500 » reste couvert par le test de route.

**Tranche 5 : PASS.** La tranche change le comportement de `POST /api/appointments` et de `PATCH /api/appointments/:id/status`, atteignables en production : la preuve est due. Elle est jouée sur le **build de production** (`dist/`), migrations appliquées par le chemin du conteneur.

Steps (horloge réelle, 2026-10-01 ; PostgreSQL jetable `postgres:18` sur 54339, base vierge, SMTP volontairement injoignable) :

1. `docker run --rm -d --name cl-f001-verify5 -e POSTGRES_PASSWORD=test -p 54339:5432 postgres:18`
2. `pnpm build && cp -r src/db/migrations dist/db/migrations` (étape du `Dockerfile`), puis `DATABASE_URL=… pnpm db:migrate:prod` → `Migrations applied` ; `drizzle.__drizzle_migrations` : 3 lignes ; `pg_constraint` : `appointments_no_overlap`
3. `ADMIN_PASSWORD=… node dist/db/seed.js`, puis `PORT=3923 SMTP_HOST=127.0.0.1 SMTP_PORT=1 SESSION_SECRET=… node dist/index.js`
4. Sur `2026-10-05` : POST 10:00/60, POST 10:30/30, POST 11:00/30 ; login admin ; PATCH 10:00 → `cancelled` ; POST 10:30/30 ; PATCH 10:00 → `confirmed` ; `GET /booked?month=2026-10`

Capture (sorties curl) :

```
POST 10:00/60          → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
POST 10:30/30          → {"error":"Ce créneau vient d'être réservé, choisissez-en un autre.","code":"slot_taken"} HTTP 409
POST 11:00/30          → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
PATCH 10:00 cancelled  → HTTP 200
POST 10:30/30          → {"success":true,"message":"Votre rendez-vous a été réservé avec succès !"} HTTP 201
PATCH 10:00 confirmed  → {"error":"Ce créneau est déjà occupé par un autre rendez-vous.","code":"slot_taken"} HTTP 409
GET /booked            → [{…"11:00",30},{…"10:30",30}] HTTP 200
```

Console serveur : propre. Une ligne `[mail] appointment: Error: connect ECONNREFUSED 127.0.0.1:1` après chacun des trois `201` (échec SMTP provoqué, absorbé en fire & forget) ; aucune après le `409` du POST (pas d'email pour une demande refusée). Le `409` du PATCH est servi sans trace d'erreur : la violation est traduite, pas remontée en 500. L'annulé libère bien le créneau, l'adjacent 11:00 est accepté. Conteneurs `cl-f001-verify5` et `coaching-life-test-db` supprimés.

**Tranche 6 : PASS.** La tranche change le calendrier et le sélecteur de créneaux de la page d'accueil (panneau « Prendre rendez-vous »), déjà accessibles en production. La preuve est donc due.

Steps (front `ng serve --port 4300`, Chromium headless via `playwright-core` 1.58, fuseau `Europe/Paris`, `GET /api/**` servis par des listes vides interceptées : aucun RDV pris, aucun jour désactivé) :

1. `/` → clic sur le bouton « Prendre rendez-vous » de la section contact (`aria-controls="contact-panel"`) → calendrier rendu
2. Lecture de `disabled` et `aria-label` des jours 1, 2, 3 et 5 d'octobre 2026
3. Clic sur un jour → lecture des boutons de durée et des créneaux en 1h, puis en « 30 min » → clic sur `17:30` → présence du formulaire
4. Scénario A : horloge réelle (2026-10-01 20:36 CEST, seuil au 2026-10-02 20:36), jour 5. Scénario B : horloge fixée `page.clock.setFixedTime('2026-10-01T08:00:00Z')` (seuil au 2026-10-02 10:00), jour 2

Capture (DOM relevé ; captures d'écran `verify6-calendar.png`, `fixed-verify6-picker.png` prises dans le scratchpad de session : calendrier avec 1, 2 et les week-ends en rouge, puis jour 2 sélectionné avec la grille 10:00…17:30 en 30 min) :

```
A (réel 20:36)  jour 1 → disabled  "jeudi 1 octobre 2026, indisponible : Délai de prévenance de 24 h"
                jour 2 → disabled  "vendredi 2 octobre 2026, indisponible : Délai de prévenance de 24 h"
                jour 3 → disabled  "samedi 3 octobre 2026, indisponible : Weekend"
                jour 5 → actif     "lundi 5 octobre 2026, disponible"
                durées ["30 min","1h"] ; 1h 09:00…17:00 (17) ; 30 min 09:00…17:30 (18) ; formulaire affiché après 17:30
B (08:00Z)      jour 1 → disabled  "…, indisponible : Délai de prévenance de 24 h" ; jour 2 → actif "vendredi 2 octobre 2026, disponible"
                jour 2 : 1h 10:00…17:00 (15) ; 30 min 10:00…17:30 (16) ; formulaire affiché après 17:30
```

Console navigateur : propre (0 `console.error`, 0 `pageerror`, dans les deux scénarios). Log `ng serve` : seulement l'avertissement attendu NG0751 (`@defer` chargé en eager sous HMR), aucune erreur SSR. Les créneaux du lendemain à moins de 24 h sont masqués, et les jours sans créneau réservable sont indisponibles avec la raison exacte. Le parcours nominal (jour lointain, journée complète, sélection, formulaire) n'a pas régressé.
