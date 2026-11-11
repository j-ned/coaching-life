import { describe, expect, it } from 'vitest';
import { withOpportunisticPurge } from './rate-limit-store.js';
import {
  InMemoryRateLimitStore,
  ManualClock,
  UnreachableRateLimitStore,
} from '../test/rate-limit-fakes.js';

const WINDOW_MS = 60_000;
const PURGE_INTERVAL_MS = 60_000;

class FailingPurgeStore extends InMemoryRateLimitStore {
  readonly purgeFailure = new Error('Délai dépassé pendant la purge');

  override purgeExpired = async (): Promise<void> => {
    throw this.purgeFailure;
  };
}

function setup(inner: InMemoryRateLimitStore | UnreachableRateLimitStore, clock: ManualClock) {
  const purgeErrors: unknown[] = [];
  const store = withOpportunisticPurge(inner, {
    intervalMs: PURGE_INTERVAL_MS,
    now: clock.now,
    onPurgeError: (err) => purgeErrors.push(err),
  });
  return { store, purgeErrors };
}

describe('withOpportunisticPurge', () => {
  it('supprime les fenêtres expirées au premier comptage, puis au plus une fois par intervalle', async () => {
    const clock = new ManualClock();
    const inner = new InMemoryRateLimitStore(clock);
    const { store } = setup(inner, clock);

    await store.hit('a', WINDOW_MS);
    const afterFirstHit = inner.purgeCount;
    clock.advance(PURGE_INTERVAL_MS - 1);
    await store.hit('a', WINDOW_MS);
    const beforeInterval = inner.purgeCount;
    clock.advance(1);
    await store.hit('a', WINDOW_MS);

    expect([afterFirstHit, beforeInterval, inner.purgeCount]).toEqual([1, 1, 2]);
  });

  it('ne garde que les fenêtres encore ouvertes après une purge', async () => {
    const clock = new ManualClock();
    const inner = new InMemoryRateLimitStore(clock);
    const { store } = setup(inner, clock);
    await store.hit('ancienne', WINDOW_MS);

    clock.advance(PURGE_INTERVAL_MS);
    await store.hit('courante', WINDOW_MS);

    expect(inner.size).toBe(1);
  });

  it('rend le comptage même si la purge échoue, et signale cet échec', async () => {
    const clock = new ManualClock();
    const inner = new FailingPurgeStore(clock);
    const { store, purgeErrors } = setup(inner, clock);

    const hit = await store.hit('a', WINDOW_MS);

    expect(hit).toEqual({ count: 1, retryAfterMs: WINDOW_MS });
    expect(purgeErrors).toEqual([inner.purgeFailure]);
  });

  it("propage l'échec du comptage sans le convertir en autorisation", async () => {
    const inner = new UnreachableRateLimitStore();
    const { store, purgeErrors } = setup(inner, new ManualClock());

    await expect(store.hit('a', WINDOW_MS)).rejects.toBe(inner.failure);
    expect(purgeErrors).toEqual([]);
  });
});
