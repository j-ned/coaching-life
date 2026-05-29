-- Convertit les URLs d'images absolues (tout domaine / schéma) en chemins relatifs same-origin.
-- Corrige le mixed content après migration de domaine (ex. http://ancien-domaine/api/storage/files/...).

UPDATE "pages"
SET "image_url" = regexp_replace("image_url", '^https?://[^/]+(/api/storage/files/)', '\1')
WHERE "image_url" ~ '^https?://[^/]+/api/storage/files/';

UPDATE "site_settings"
SET "value" = regexp_replace("value"::text, 'https?://[^/"]+(/api/storage/files/)', '\1', 'g')::jsonb
WHERE "value"::text ~ 'https?://[^/"]+/api/storage/files/';
