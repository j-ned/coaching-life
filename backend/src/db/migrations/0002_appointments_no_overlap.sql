-- Interdit en base deux rendez-vous non annulés qui se chevauchent (cf. ADR-0001).
-- Avant de déployer : backend/scripts/preflight-0002-appointments.sql doit renvoyer 0 ligne
-- bloquante, sinon la création de la contrainte échoue et le conteneur ne démarre pas.

-- make_timestamp (IMMUTABLE) et non un cast text::timestamp (STABLE, dépend de DateStyle),
-- refusé dans une expression d'index. Heure murale de Paris, plage semi-ouverte [).
CREATE FUNCTION appointment_slot(d text, t text, dur integer) RETURNS tsrange
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT tsrange(start_at, start_at + make_interval(mins => dur), '[)')
  FROM (
    SELECT make_timestamp(split_part(d, '-', 1)::int, split_part(d, '-', 2)::int,
                          split_part(d, '-', 3)::int, split_part(t, ':', 1)::int,
                          split_part(t, ':', 2)::int, 0) AS start_at
  ) AS slot_start
$$;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (appointment_slot("appointment_date", "appointment_time", "duration") WITH &&)
  WHERE ("status" <> 'cancelled');
