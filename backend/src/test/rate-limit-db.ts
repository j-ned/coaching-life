import { sql } from 'drizzle-orm';
import type { db as appDb } from '../db/index.js';
import { rate_limit_hits } from '../db/schema.js';

type Db = typeof appDb;

export async function resetRateLimitHits(db: Db): Promise<void> {
  await db.execute(sql`TRUNCATE ${rate_limit_hits}`);
}

// Fenêtre déjà close, comme en laisse une requête passée : l'horloge est celle de la base.
export async function seedExpiredHit(db: Db, key: string, count = 1): Promise<void> {
  await db.insert(rate_limit_hits).values({
    key,
    window_start: sql`now() - interval '2 minutes'`,
    expires_at: sql`now() - interval '1 minute'`,
    count,
  });
}

export async function listRateLimitHits(db: Db) {
  return db
    .select({ key: rate_limit_hits.key, count: rate_limit_hits.count })
    .from(rate_limit_hits)
    .orderBy(rate_limit_hits.key, rate_limit_hits.window_start);
}
