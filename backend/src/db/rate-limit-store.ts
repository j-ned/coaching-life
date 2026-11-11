import { lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { db as appDb } from './index.js';
import { rate_limit_hits } from './schema.js';
import type { PurgeableRateLimitStore } from '../lib/rate-limit-store.js';

const hitRowSchema = z.object({
  count: z.number().int().positive(),
  retry_after_ms: z.number().int().nonnegative(),
});

export function createRateLimitStore(db: typeof appDb): PurgeableRateLimitStore {
  return {
    // Un seul ordre SQL : l'incrément est atomique grâce à la clé primaire (key, window_start),
    // sans transaction ni verrou applicatif, quel que soit le nombre d'instances. La fenêtre est
    // alignée sur l'horloge de PostgreSQL (multiples de windowMs depuis l'epoch) : toutes les
    // instances tombent sur la même ligne.
    hit: async (key, windowMs) => {
      const result = await db.execute(sql`
        WITH current_window AS (
          SELECT to_timestamp(
            floor(extract(epoch FROM now()) * 1000 / ${windowMs}::integer) * ${windowMs}::integer / 1000.0
          ) AS started_at
        )
        INSERT INTO ${rate_limit_hits} ("key", "window_start", "expires_at")
        SELECT ${key}, started_at, started_at + make_interval(secs => ${windowMs}::integer / 1000.0)
        FROM current_window
        ON CONFLICT ("key", "window_start") DO UPDATE SET "count" = ${rate_limit_hits.count} + 1
        RETURNING
          "count",
          greatest(ceil(extract(epoch FROM "expires_at" - now()) * 1000), 0)::integer AS retry_after_ms
      `);
      const row = hitRowSchema.parse(result.rows[0]);
      return { count: row.count, retryAfterMs: row.retry_after_ms };
    },

    // S'appuie sur l'index rate_limit_hits_expires_at_idx.
    purgeExpired: async () => {
      await db.delete(rate_limit_hits).where(lt(rate_limit_hits.expires_at, sql`now()`));
    },
  };
}
