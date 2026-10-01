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

## Implémentation

### Tranche 1

- `CreateAppointmentInput` et `createAppointmentSchema` vivent dans `backend/src/lib/appointment-schema.ts` (sortis de la route) : `db/booking-repository.ts` et `lib/booking-notifier.ts` en dépendent sans importer `routes/`.
- Ports réduits à ce que la tranche exerce : `BookingRepository = { insert }` (`isDateDisabled` arrive en tranche 2 avec `disabled_date`), `BookingNotifier = { appointmentBooked }`. `createBookingRepository(db)` fait l'insert Drizzle sans mapping d'erreur ; `mailBookingNotifier` reprend les deux envois existants.
- `createAppointmentRoutes({ bookings, notifier, now })` : rate-limit de soumission instancié dans la factory ; `appointmentRoutes = createAppointmentRoutes(defaultDeps)` exporté, `backend/src/index.ts` inchangé. `now` fait partie du contrat de deps mais n'est lu qu'à partir de la tranche 2.
- **Écart au plan** : `checkBookingRules` « réduit à `{ ok: true }` » n'est **pas** introduit. Aucun test de la tranche ne l'exerce, et une fonction qui renvoie toujours `ok` serait du code non couvert. Il arrive en tranche 2 avec sa première règle (`invalid_date`).

## Journal des tranches

- **Tranche 1 — réservation nominale acceptée, infra de test backend** : GREEN 13 passed / 13 total (4 route + 9 `toParisDateTime`) · refactor : passe manuelle (skill `simplify` indisponible en sous-agent), `ParisDateTime` dés-exporté (aucun consommateur hors fichier), import de type `db` renommé `appDb` dans le repository pour ne pas masquer le paramètre

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
