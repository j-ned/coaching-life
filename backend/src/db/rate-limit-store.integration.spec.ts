import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { db } from './index.js';
import { createRateLimitStore } from './rate-limit-store.js';
import { withOpportunisticPurge } from '../lib/rate-limit-store.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { listRateLimitHits, resetRateLimitHits, seedExpiredHit } from '../test/rate-limit-db.js';

const WINDOW_MS = 60_000;
const PARALLEL_REQUESTS = 40;

describe('compteur de limitation de débit sur PostgreSQL', () => {
  beforeEach(async () => {
    await resetRateLimitHits(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("numérote les requêtes d'une même clé et annonce la fin de la fenêtre courante", async () => {
    const store = createRateLimitStore(db);

    const first = await store.hit('cle-a', WINDOW_MS);
    const second = await store.hit('cle-a', WINDOW_MS);

    expect([first.count, second.count]).toEqual([1, 2]);
    expect(first.retryAfterMs).toBeGreaterThan(0);
    expect(first.retryAfterMs).toBeLessThanOrEqual(WINDOW_MS);
    expect(await listRateLimitHits(db)).toEqual([{ key: 'cle-a', count: 2 }]);
  });

  it('compte séparément deux clés', async () => {
    const store = createRateLimitStore(db);
    await store.hit('cle-a', WINDOW_MS);

    const other = await store.hit('cle-b', WINDOW_MS);

    expect(other.count).toBe(1);
  });

  it('ne perd aucune requête quand elles arrivent en même temps sur la même clé', async () => {
    const store = createRateLimitStore(db);

    const hits = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, () => store.hit('cle-a', WINDOW_MS)),
    );

    const counts = hits.map((hit) => hit.count).sort((a, b) => a - b);
    expect(counts).toEqual(Array.from({ length: PARALLEL_REQUESTS }, (_, index) => index + 1));
  });

  it('repart de 1 sans tenir compte du compteur de la fenêtre précédente', async () => {
    const store = createRateLimitStore(db);
    await seedExpiredHit(db, 'cle-a', 99);

    const hit = await store.hit('cle-a', WINDOW_MS);

    expect(hit.count).toBe(1);
  });

  it('purgeExpired supprime les fenêtres closes et conserve les fenêtres ouvertes', async () => {
    const store = createRateLimitStore(db);
    await seedExpiredHit(db, 'close-1');
    await seedExpiredHit(db, 'close-2');
    await store.hit('ouverte', WINDOW_MS);

    await store.purgeExpired();

    expect(await listRateLimitHits(db)).toEqual([{ key: 'ouverte', count: 1 }]);
  });

  it('refuse en base une clé de plus de 64 caractères', async () => {
    const store = createRateLimitStore(db);

    await expect(store.hit('x'.repeat(65), WINDOW_MS)).rejects.toThrow();
    expect(await listRateLimitHits(db)).toEqual([]);
  });

  it('supprime au passage les fenêtres closes laissées par les requêtes passées', async () => {
    await seedExpiredHit(db, 'close-1');
    const store = withOpportunisticPurge(createRateLimitStore(db), {
      intervalMs: 60_000,
      now: () => 0,
      onPurgeError: (err) => {
        throw err;
      },
    });

    await store.hit('ouverte', WINDOW_MS);

    expect(await listRateLimitHits(db)).toEqual([{ key: 'ouverte', count: 1 }]);
  });

  describe('middleware branché sur son stockage par défaut', () => {
    it("n'accepte que max requêtes parmi des requêtes simultanées d'une même IP", async () => {
      const max = 5;
      const app = new Hono().post('/', rateLimit({ windowMs: WINDOW_MS, max }), (c) =>
        c.text('ok'),
      );

      const responses = await Promise.all(
        Array.from({ length: PARALLEL_REQUESTS }, () =>
          app.request('/', { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7' } }),
        ),
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 200)).toHaveLength(max);
      expect(statuses.filter((status) => status === 429)).toHaveLength(PARALLEL_REQUESTS - max);
      expect((await listRateLimitHits(db)).map((row) => row.count)).toEqual([PARALLEL_REQUESTS]);
    });
  });
});
