-- Contrôle préalable à la migration 0002_appointments_no_overlap (cf. specs/002, ADR-0001).
--
-- LECTURE SEULE : à lancer sur la base de prod AVANT de déployer la migration.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/preflight-0002-appointments.sql
--
-- La migration échoue (et le conteneur ne démarre pas) si une ligne NON annulée :
--   (1) a une date / heure / durée que appointment_slot() ne sait pas convertir, ou
--   (2) chevauche une autre ligne non annulée.
-- Les deux contrôles doivent renvoyer 0 ligne. La section (3) est informative.

BEGIN TRANSACTION READ ONLY;

-- (1) Valeurs qui feraient échouer appointment_slot() pendant la création de la contrainte.
--     Seules les lignes non annulées sont indexées (contrainte partielle), mais on liste tout
--     pour information : la colonne `bloquant` indique celles qui cassent la migration.
WITH parsed AS MATERIALIZED (
  SELECT
    a.*,
    a.appointment_date ~ '^\d{4}-\d{2}-\d{2}$' AS date_shape_ok,
    a.appointment_time ~ '^\d{2}:\d{2}$' AS time_shape_ok
  FROM appointments a
),
checked AS MATERIALIZED (
  SELECT
    p.*,
    CASE
      WHEN NOT p.date_shape_ok THEN 'date mal formée'
      WHEN split_part(p.appointment_date, '-', 1)::int < 1 THEN 'année invalide'
      WHEN split_part(p.appointment_date, '-', 2)::int NOT BETWEEN 1 AND 12 THEN 'mois invalide'
      WHEN split_part(p.appointment_date, '-', 3)::int < 1
        OR split_part(p.appointment_date, '-', 3)::int > extract(
             day FROM make_date(split_part(p.appointment_date, '-', 1)::int,
                                split_part(p.appointment_date, '-', 2)::int, 1)
                      + interval '1 month - 1 day')
        THEN 'jour inexistant'
      WHEN NOT p.time_shape_ok THEN 'heure mal formée'
      WHEN split_part(p.appointment_time, ':', 1)::int > 23
        OR split_part(p.appointment_time, ':', 2)::int > 59 THEN 'heure hors limites'
      WHEN p.duration < 0 THEN 'durée négative'
    END AS anomalie
  FROM parsed p
)
SELECT
  id, status, appointment_date, appointment_time, duration, anomalie,
  status <> 'cancelled' AS bloquant
FROM checked
WHERE anomalie IS NOT NULL
ORDER BY bloquant DESC, appointment_date, appointment_time;

-- (2) Paires de rendez-vous non annulés qui se chevauchent : même plage [) que la contrainte.
--     Bornes adjacentes (10:00-11:00 et 11:00-11:30) = pas de chevauchement.
WITH valid AS MATERIALIZED (
  SELECT *
  FROM appointments
  WHERE status <> 'cancelled'
    AND appointment_date ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
    AND appointment_date !~ '^0000'
    AND appointment_time ~ '^([01]\d|2[0-3]):[0-5]\d$'
    AND duration >= 0
),
real_days AS MATERIALIZED (
  -- Écarte les jours inexistants (ex. 2026-02-30), déjà remontés par le contrôle (1),
  -- sans to_date() qui lèverait une erreur dessus.
  SELECT v.*
  FROM valid v
  WHERE split_part(v.appointment_date, '-', 3)::int <= extract(
          day FROM make_date(split_part(v.appointment_date, '-', 1)::int,
                             split_part(v.appointment_date, '-', 2)::int, 1)
                   + interval '1 month - 1 day')
),
slots AS MATERIALIZED (
  -- Même calcul que appointment_slot() de la migration 0002.
  SELECT
    r.*,
    tsrange(
      make_timestamp(split_part(r.appointment_date, '-', 1)::int,
                     split_part(r.appointment_date, '-', 2)::int,
                     split_part(r.appointment_date, '-', 3)::int,
                     split_part(r.appointment_time, ':', 1)::int,
                     split_part(r.appointment_time, ':', 2)::int, 0),
      make_timestamp(split_part(r.appointment_date, '-', 1)::int,
                     split_part(r.appointment_date, '-', 2)::int,
                     split_part(r.appointment_date, '-', 3)::int,
                     split_part(r.appointment_time, ':', 1)::int,
                     split_part(r.appointment_time, ':', 2)::int, 0)
        + make_interval(mins => r.duration),
      '[)'
    ) AS slot
  FROM real_days r
)
SELECT
  a.appointment_date AS date,
  a.id AS id_a, a.appointment_time AS heure_a, a.duration AS duree_a, a.status AS statut_a,
  a.created_at AS cree_le_a,
  b.id AS id_b, b.appointment_time AS heure_b, b.duration AS duree_b, b.status AS statut_b,
  b.created_at AS cree_le_b
FROM slots a
JOIN slots b ON a.id < b.id AND a.slot && b.slot
ORDER BY a.appointment_date, a.appointment_time;

-- (3) Informatif, non bloquant pour la migration : lignes non annulées hors des règles métier
--     désormais appliquées par l'API (durées 30/60, 9h-18h, pas de 30 min). Les rendez-vous
--     existants restent valides ; c'est seulement pour savoir ce qui a été saisi par le passé.
SELECT id, status, appointment_date, appointment_time, duration
FROM appointments
WHERE status <> 'cancelled'
  AND appointment_time ~ '^([01]\d|2[0-3]):[0-5]\d$'
  AND (
    duration NOT IN (30, 60)
    OR split_part(appointment_time, ':', 2) NOT IN ('00', '30')
    OR appointment_time < '09:00'
    OR split_part(appointment_time, ':', 1)::int * 60
       + split_part(appointment_time, ':', 2)::int + duration > 18 * 60
  )
ORDER BY appointment_date, appointment_time;

ROLLBACK;

-- Résolution (NON exécutée par ce script, décision humaine) : pour chaque paire du contrôle (2),
-- choisir le rendez-vous à garder (souvent le plus ancien, `cree_le`), prévenir le client de l'autre,
-- puis l'annuler, ce qui le sort de la contrainte sans perdre l'historique :
--   UPDATE appointments SET status = 'cancelled' WHERE id = '<uuid>';
-- Pour une ligne du contrôle (1) : corriger la valeur à la main, ou l'annuler.
